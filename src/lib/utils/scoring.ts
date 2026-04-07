export function getScoreColor(score: number, max = 5): string {
  const pct = score / max
  if (pct <= 0.4) return '#D85A30'
  if (pct <= 0.7) return '#EF9F27'
  return '#1D9E75'
}

export function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function isSunday(date = new Date()): boolean {
  return date.getDay() === 0
}
