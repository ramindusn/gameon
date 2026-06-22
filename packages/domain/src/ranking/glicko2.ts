// Glicko-2 rating system (Glickman 2013), pure + deterministic — see ADR 0011.
// A single rating-period update for one entity (a player or a partnership)
// against the synthetic opponents it faced that period. No I/O, no clock: the
// caller decides what a "period" is (one locked game day) and supplies the
// opponents, so this is trivially unit-testable against published vectors.

export const GLICKO2_SCALE = 173.7178
export const DEFAULT_RATING = 1500
export const DEFAULT_RD = 350
export const DEFAULT_VOLATILITY = 0.06
/** System constant τ: constrains how much volatility can move per period. */
export const SYSTEM_TAU = 0.5
const CONVERGENCE = 1e-6

export interface Glicko2 {
  /** Display-scale rating (≈1500 default). */
  rating: number
  /** Rating deviation — uncertainty; large when new/idle, shrinks with play. */
  rd: number
  /** Volatility — expected fluctuation of the rating. */
  vol: number
}

/** One game from the rated entity's point of view, in display-scale units. */
export interface Glicko2Game {
  /** Opponent rating. */
  rating: number
  /** Opponent rating deviation. */
  rd: number
  /** Outcome for the rated entity: 1 win, 0 loss, or any share in [0, 1]. */
  score: number
}

/** A fresh, unrated entity. */
export const defaultGlicko2 = (): Glicko2 => ({
  rating: DEFAULT_RATING,
  rd: DEFAULT_RD,
  vol: DEFAULT_VOLATILITY,
})

// g(φ) and the expected score E — the Glicko-2 logistic kernel.
const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
const expectation = (mu: number, muJ: number, phiJ: number) =>
  1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)))

/**
 * Glicko-2 update for one entity over a rating period.
 *
 * With **no games**, the rating and volatility hold and only RD inflates
 * (uncertainty grows while idle), capped at the default RD. With games, the full
 * Glickman procedure runs: variance, improvement, volatility (Illinois solve),
 * then new RD and rating.
 */
export function updateGlicko2(
  player: Glicko2,
  games: Glicko2Game[],
  tau = SYSTEM_TAU,
): Glicko2 {
  const mu = (player.rating - DEFAULT_RATING) / GLICKO2_SCALE
  const phi = player.rd / GLICKO2_SCALE
  const sigma = player.vol

  if (games.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma)
    return {
      rating: player.rating,
      rd: Math.min(phiStar * GLICKO2_SCALE, DEFAULT_RD),
      vol: sigma,
    }
  }

  // Steps 3 & 4: estimated variance v and the improvement-weighted sum.
  let invV = 0
  let sumGS = 0 // Σ g(φ_j)·(s_j − E_j)
  for (const game of games) {
    const muJ = (game.rating - DEFAULT_RATING) / GLICKO2_SCALE
    const phiJ = game.rd / GLICKO2_SCALE
    const gj = g(phiJ)
    const e = expectation(mu, muJ, phiJ)
    invV += gj * gj * e * (1 - e)
    sumGS += gj * (game.score - e)
  }
  const v = 1 / invV
  const delta = v * sumGS

  // Step 5: new volatility via the Illinois (regula-falsi) root finder.
  const sigmaPrime = solveVolatility(delta, phi, v, sigma, tau)

  // Steps 6 & 7: pre-period RD, then new RD and rating.
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime)
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const muPrime = mu + phiPrime * phiPrime * sumGS

  return {
    rating: muPrime * GLICKO2_SCALE + DEFAULT_RATING,
    rd: phiPrime * GLICKO2_SCALE,
    vol: sigmaPrime,
  }
}

/** Solve for the new volatility σ' (Glickman §5.1, illustrated example). */
function solveVolatility(
  delta: number,
  phi: number,
  v: number,
  sigma: number,
  tau: number,
): number {
  const a = Math.log(sigma * sigma)
  const d2 = delta * delta
  const phi2 = phi * phi
  const f = (x: number) => {
    const ex = Math.exp(x)
    const denom = phi2 + v + ex
    return (ex * (d2 - phi2 - v - ex)) / (2 * denom * denom) - (x - a) / (tau * tau)
  }

  // Bracket the root: A is ln(σ²); push B out until f(B) is positive-side.
  let A = a
  let B: number
  if (d2 > phi2 + v) {
    B = Math.log(d2 - phi2 - v)
  } else {
    let k = 1
    while (f(a - k * tau) < 0) k += 1
    B = a - k * tau
  }

  let fA = f(A)
  let fB = f(B)
  while (Math.abs(B - A) > CONVERGENCE) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB < 0) {
      A = B
      fA = fB
    } else {
      fA = fA / 2
    }
    B = C
    fB = fC
  }
  return Math.exp(A / 2)
}
