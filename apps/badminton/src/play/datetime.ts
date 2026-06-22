// Helpers to bridge an ISO timestamp (stored) and the value of a native
// <input type="datetime-local"> (local wall-clock "YYYY-MM-DDTHH:mm").

/** ISO string -> value for a datetime-local input, in the browser's local tz. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // Shift by the tz offset so toISOString's slice reflects local wall-clock.
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

/** datetime-local input value (local wall-clock) -> ISO string for storage. */
export function localInputToIso(local: string): string {
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

/** Current time as a datetime-local input value. */
export function nowLocalInput(): string {
  return isoToLocalInput(new Date().toISOString())
}

/** Human-readable game-day date/time. */
export function formatPlayedAt(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
