export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
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
