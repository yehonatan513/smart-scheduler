/**
 * Returns a local date string in YYYY-MM-DD format.
 * Unlike toISOString().split('T')[0], this uses the local timezone,
 * so it won't return the wrong date near midnight.
 */
export function toLocalDateStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
