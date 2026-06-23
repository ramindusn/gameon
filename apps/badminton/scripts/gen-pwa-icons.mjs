// Generates the PWA icon set as PNGs with no image dependencies: an emerald
// background with a white badminton shuttlecock. Run: node scripts/gen-pwa-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(OUT, { recursive: true })

// Emerald Pro palette.
const BG = [5, 9, 7] // near-black canvas
const ACCENT = [16, 185, 129] // emerald
const WHITE = [245, 247, 246]

// CRC32 + PNG chunk assembly.
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return (buf) => {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
})()

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(CRC(td), 0)
  return Buffer.concat([len, td, crc])
}

function png(size, draw) {
  const px = Buffer.alloc(size * size * 4)
  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = a
  }
  draw(set, size)
  // Add the per-row filter byte (0 = none).
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Draw the artwork into a `size` canvas. `inset` keeps the shuttle inside the
// maskable safe area (~80%).
function shuttle(inset) {
  return (set, size) => {
    const c = size / 2
    const fillBg = ([r, g, b]) => {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, [r, g, b])
    }
    fillBg(BG)
    // Emerald rounded panel.
    const pad = size * (inset ? 0.12 : 0.06)
    const rad = size * 0.22
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const inX = x >= pad && x <= size - pad
        const inY = y >= pad && y <= size - pad
        if (!inX || !inY) continue
        // round the corners
        const cx = Math.min(Math.max(x, pad + rad), size - pad - rad)
        const cy = Math.min(Math.max(y, pad + rad), size - pad - rad)
        if (Math.hypot(x - cx, y - cy) <= rad) set(x, y, ACCENT)
      }
    }
    const s = size * (inset ? 0.78 : 0.9)
    const off = (size - s) / 2
    // Skirt: a white trapezoid (feathers) — wide at top, narrow at the cork —
    // with thin emerald lines suggesting feather seams.
    const topY = Math.round(off + s * 0.16)
    const botY = Math.round(off + s * 0.62)
    const wTop = s * 0.32
    const wBot = s * 0.09
    for (let y = topY; y <= botY; y++) {
      const t = (y - topY) / (botY - topY)
      const half = Math.round(wTop * (1 - t) + wBot * t)
      for (let x = Math.round(c - half); x <= Math.round(c + half); x++) set(x, y, WHITE)
    }
    // Feather seams: a few emerald lines radiating from the cork.
    for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) {
      for (let y = topY; y <= botY; y++) {
        const t = (y - topY) / (botY - topY)
        const half = wTop * (1 - t) + wBot * t
        const x = Math.round(c + k * half)
        set(x, y, ACCENT)
      }
    }
    // Cork: a filled white circle at the narrow end.
    const corkR = Math.round(s * 0.12)
    const corkY = Math.round(off + s * 0.7)
    for (let y = corkY - corkR; y <= corkY + corkR; y++)
      for (let x = Math.round(c - corkR); x <= c + corkR; x++)
        if (Math.hypot(x - c, y - corkY) <= corkR) set(x, y, WHITE)
  }
}

const targets = [
  ['pwa-192.png', 192, false],
  ['pwa-512.png', 512, false],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
  ['favicon-32.png', 32, false],
]
for (const [name, size, inset] of targets) {
  writeFileSync(join(OUT, name), png(size, shuttle(inset)))
  console.log('wrote', name, size)
}
