/** Локальная дата браузера в формате YYYY-MM-DD: «сегодня» считаем там, где сидит пользователь */
export function todayLocal(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}
