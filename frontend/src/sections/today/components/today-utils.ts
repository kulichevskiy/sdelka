import type { TodayDeal, TodayTask } from '../types'

const moneyFormatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(amount: number, currency: string): string {
  let formatter = moneyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })
    moneyFormatters.set(currency, formatter)
  }
  return formatter.format(amount)
}

const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const longDate = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

export function formatShortDate(isoDate: string): string {
  return shortDate.format(new Date(`${isoDate}T00:00:00`))
}

export function formatLongDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00`))
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime()
  const to = new Date(`${toIso}T00:00:00`).getTime()
  return Math.round((to - from) / 86_400_000)
}

/**
 * Дата на следующий день от переданной — для быстрого переноса «Завтра».
 * Собираем строку из локальных частей даты: toISOString() переводит в UTC и в
 * часовых поясах восточнее Гринвича возвращает предыдущий день.
 */
export function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** «просрочено на 2 дня» — склонение по числу дней */
export function overdueLabel(days: number): string {
  const abs = Math.abs(days)
  const lastTwo = abs % 100
  const last = abs % 10
  const word =
    lastTwo >= 11 && lastTwo <= 14 ? 'дней' : last === 1 ? 'день' : last >= 2 && last <= 4 ? 'дня' : 'дней'
  return `просрочено на ${abs} ${word}`
}

/** «3 дела» — склонение для строки статуса */
export function pluralize(count: number, one: string, few: string, many: string): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

export interface TodayGroups {
  overdue: TodayTask[]
  today: TodayTask[]
  /** Сделки пользователя, у которых не осталось ни одной невыполненной задачи */
  withoutNextStep: TodayDeal[]
}

export function groupWork(tasks: TodayTask[], deals: TodayDeal[], today: string): TodayGroups {
  const open = tasks.filter((task) => !task.isDone)
  const dealsWithOpenTask = new Set(open.map((task) => task.dealId))

  return {
    overdue: open
      .filter((task) => task.dueDate < today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    today: open.filter((task) => task.dueDate === today),
    withoutNextStep: deals.filter((deal) => !dealsWithOpenTask.has(deal.id)),
  }
}

export function dealById(deals: TodayDeal[], id: string): TodayDeal | undefined {
  return deals.find((deal) => deal.id === id)
}
