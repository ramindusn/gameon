// Date/id helpers for the fund domain. The app stores naive wall-clock strings
// ('YYYY-MM-DDTHH:mm') and never does timezone math — it slices to a date and
// sorts lexically — so these stay deliberately timezone-free.

/** A fresh unique id. */
export function uid(): string {
  return crypto.randomUUID()
}

/** Today's date as an ISO date string (YYYY-MM-DD). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Current local date-time formatted for an <input type="datetime-local"> value. */
export function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Format a stored date or date-time string for display. */
export function formatDateTime(value: string): string {
  const hasTime = value.includes('T')
  const d = new Date(hasTime ? value : value + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return value
  if (!hasTime) {
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format an ISO date as a short human label. */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
