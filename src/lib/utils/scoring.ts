export function getScoreColor(score: number, max = 5): string {
  const pct = score / max
  if (pct <= 0.4) return '#D85A30'
  if (pct <= 0.7) return '#EF9F27'
  return '#1D9E75'
}

export function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  // Set to noon to avoid DST edge cases shifting the date
  d.setHours(12, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  // Format as local YYYY-MM-DD without UTC conversion
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function isSunday(date = new Date()): boolean {
  // getDay() uses local time — correct for this purpose
  return new Date(date).getDay() === 0
}
