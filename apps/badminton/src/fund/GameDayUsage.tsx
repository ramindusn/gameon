import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Field, Modal, Select } from '@gameon/ui'
import { holderStock, type FundState } from '@gameon/domain'
import { Icon } from '../app/Icon'
import {
  loadSessionUsage,
  loadStockContext,
  recordGameDayUsage,
  type StockContext,
  type UsageLine,
} from './usageApi'

/** The signed-in person's stock context; `myHolderId` means they can record. */
export function useStockContext() {
  return useQuery({ queryKey: ['stock-context'], queryFn: loadStockContext })
}

/** Usage already recorded against a game day. */
function useSessionUsage(sessionId: string) {
  return useQuery({
    queryKey: ['session-usage', sessionId],
    queryFn: () => loadSessionUsage(sessionId),
  })
}

/**
 * Shuttle usage for a game day (TASK-69.8). The matchmaker running the day
 * enters how many shuttles each brand used; the count comes out of a
 * matchmaker's held stock — theirs by default, someone else's when the barrels
 * were shared. Available while the day is live and afterwards, so a day that
 * was finished in a hurry can still have its usage added.
 *
 * Rendered without chrome so it can sit inside the finish-game-day popup
 * (TASK-70); the page itself shows the compact GameDayUsagePanel instead.
 */
export function GameDayUsage({
  sessionId,
  onSaved,
  secondary,
}: {
  sessionId: string
  /** Called after a successful save — the popup uses it to close itself. */
  onSaved?: () => void
  /** Extra button beside "Record usage" (the popup's "Later"). */
  secondary?: ReactNode
}) {
  const qc = useQueryClient()
  const { data: ctx } = useStockContext()
  const { data: recorded } = useSessionUsage(sessionId)

  // Only matchmakers record usage; everyone else gets nothing at all.
  if (!ctx?.myHolderId) return null

  return (
    <>
      <UsageForm
        ctx={ctx}
        sessionId={sessionId}
        secondary={secondary}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ['session-usage', sessionId] })
          void qc.invalidateQueries({ queryKey: ['stock-context'] })
          void qc.invalidateQueries({ queryKey: ['my-stock'] })
          onSaved?.()
        }}
      />

      {!!recorded?.length && (
        <section className="mt-4" data-testid="recorded-usage">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            Already recorded
          </h3>
          <ul className="mt-2 divide-y divide-line text-sm">
            {recorded.map((entry) => (
              <li key={entry.entryId} className="py-1.5">
                {entry.items.map((i) => (
                  <div key={i.productId} className="flex justify-between gap-3">
                    <span className="text-fg">
                      {i.shuttlesUsed} × {i.brand}
                    </span>
                    <span className="text-fg-muted">
                      from {i.holderName ?? 'unknown'}
                    </span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/**
 * The finish-game-day prompt (TASK-70). Finishing a day pops this up so the
 * shuttles used get recorded while they are still fresh; "Later" dismisses it
 * without recording — the day is already finished either way, and the page's
 * panel can re-open this at any time.
 */
export function GameDayUsageModal({
  sessionId,
  open,
  onClose,
  onLater,
}: {
  sessionId: string
  open: boolean
  onClose: () => void
  /** "Later" — deferring keeps the matchmaker on the page, where the panel
   *  offers the way back in. Defaults to a plain close. */
  onLater?: () => void
}) {
  if (!open) return null
  return (
    <Modal open title="Shuttles used" onClose={onClose}>
      <GameDayUsage
        sessionId={sessionId}
        onSaved={onClose}
        secondary={
          <Button
            type="button"
            variant="secondary"
            onClick={onLater ?? onClose}
            data-testid="usage-later"
          >
            Later
          </Button>
        }
      />
    </Modal>
  )
}

/**
 * Compact usage summary for the game day page (TASK-70) — replaces the
 * permanently-open form. Shows what has been recorded (or that nothing has),
 * and opens the popup to add or correct it, live or finished.
 */
export function GameDayUsagePanel({
  sessionId,
  onOpen,
}: {
  sessionId: string
  onOpen: () => void
}) {
  const { data: ctx } = useStockContext()
  const { data: recorded } = useSessionUsage(sessionId)

  // Only matchmakers record usage; everyone else gets nothing at all.
  if (!ctx?.myHolderId) return null

  // One line per brand+holder, summed across however many times it was recorded.
  const totals = new Map<string, { brand: string; holder: string; used: number }>()
  for (const entry of recorded ?? []) {
    for (const item of entry.items) {
      const holder = item.holderName ?? 'unknown'
      const key = `${item.productId}|${holder}`
      const row = totals.get(key)
      if (row) row.used += item.shuttlesUsed
      else totals.set(key, { brand: item.brand, holder, used: item.shuttlesUsed })
    }
  }
  const lines = [...totals.values()]

  return (
    <Card
      title="Shuttles used"
      icon={<Icon name="inventory" />}
      action={
        <Button onClick={onOpen} data-testid="open-usage">
          {lines.length ? 'Update usage' : 'Record usage'}
        </Button>
      }
    >
      {lines.length === 0 ? (
        <p className="text-sm text-fg-muted" data-testid="usage-empty">
          No shuttles recorded for this game day yet.
        </p>
      ) : (
        <ul className="divide-y divide-line text-sm" data-testid="usage-summary">
          {lines.map((l) => (
            <li key={`${l.brand}|${l.holder}`} className="flex justify-between gap-3 py-1.5">
              <span className="text-fg">
                {l.used} × {l.brand}
              </span>
              <span className="text-fg-muted">from {l.holder}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function UsageForm({
  ctx,
  sessionId,
  onSaved,
  secondary,
}: {
  ctx: StockContext
  sessionId: string
  onSaved: () => void
  secondary?: ReactNode
}) {
  // The stock helpers read a FundState; usage only needs these three slices.
  const stockState: FundState = {
    members: [],
    purchases: [],
    usage: [],
    expenses: [],
    products: ctx.products,
    holders: ctx.holders,
    holdings: ctx.holdings,
  }

  // Only people actually holding something can have usage taken off them.
  const candidates = ctx.holders.filter(
    (h) => holderStock(stockState, h.id).items.length > 0,
  )
  const iHoldStock = candidates.some((h) => h.id === ctx.myHolderId)

  // Whose barrels these came out of — mine by default when I hold any stock,
  // otherwise nothing is preselected and the matchmaker has to say.
  const [holderId, setHolderId] = useState(iHoldStock ? (ctx.myHolderId ?? '') : '')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  // Only the brands that person actually has, with what they have left.
  const stock = holderId ? holderStock(stockState, holderId) : null
  const items = stock?.items ?? []

  const save = useMutation({
    mutationFn: (lines: UsageLine[]) => recordGameDayUsage({ ctx, sessionId, lines }),
    onSuccess: () => {
      setCounts({})
      setError('')
      onSaved()
    },
    onError: (e: Error) => setError(e.message),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const holder = candidates.find((h) => h.id === holderId)
    // No silent fallback: if we cannot tell whose barrels these were, ask.
    if (!holder) return setError('Choose whose stock the shuttles came out of.')

    const lines: UsageLine[] = []
    for (const item of items) {
      const used = Number(counts[item.product.id] || 0)
      if (!used) continue
      if (!Number.isInteger(used) || used < 0) {
        return setError('Shuttle counts must be whole numbers.')
      }
      lines.push({ product: item.product, holder, shuttlesUsed: used })
    }
    if (lines.length === 0) return setError('Enter how many shuttles were used.')
    save.mutate(lines)
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="usage-form">
      <Select
        label="From whose stock"
        data-testid="usage-holder"
        value={holderId}
        onChange={(e) => {
          setHolderId(e.target.value)
          setCounts({}) // counts belong to the previous person's brands
          setError('')
        }}
      >
        <option value="">
          {candidates.length === 0 ? 'Nobody is holding stock' : 'Choose whose stock…'}
        </option>
        {candidates.map((h) => (
          <option key={h.id} value={h.id}>
            {h.id === ctx.myHolderId ? `${h.name} (you)` : h.name}
          </option>
        ))}
      </Select>

      {holderId && items.length === 0 && (
        <p className="text-sm text-fg-muted" data-testid="holder-has-nothing">
          {stock?.holder.name} has no shuttles left.
        </p>
      )}

      {items.map((item) => (
        <div key={item.product.id} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-fg">{item.product.brand}</p>
            <p className="text-xs text-fg-subtle" data-testid={`stock-${item.product.id}`}>
              {plural(item.barrels, 'barrel')} + {item.looseShuttles} loose ={' '}
              {item.shuttles} shuttles
            </p>
          </div>
          <div className="w-20 shrink-0">
            {/* The label repeats down the rows, so it is kept for screen readers
                only — the brand beside it already says what the number is for.
                Deliberately no `max`: native validation would block the submit
                silently, where the API refusal names who is short and by how
                much. The count above is the guide. */}
            <Field
              label={`${item.product.brand} used`}
              labelHidden
              type="number"
              min={0}
              placeholder="0"
              data-testid={`used-${item.product.id}`}
              value={counts[item.product.id] ?? ''}
              onChange={(e) =>
                setCounts((c) => ({ ...c, [item.product.id]: e.target.value }))
              }
            />
          </div>
        </div>
      ))}

      {error && (
        <p className="text-sm font-medium text-red-500" data-testid="usage-error">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {secondary}
        <Button type="submit" data-testid="save-usage" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Record usage'}
        </Button>
      </div>
    </form>
  )
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
