import type { Activity, Deal, Task, User } from '../types'

/** Состояние сделки, требующее внимания менеджера */
export type Attention = 'overdue' | 'no-next-step' | null

/** Ближайшая невыполненная задача по сделке — «следующий шаг» */
export function nextTaskOf(dealId: string, tasks: Task[]): Task | undefined {
  return tasks
    .filter((task) => task.dealId === dealId && !task.isDone)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
}

/** Закрытые сделки внимания не требуют: у них следующего шага и не должно быть */
export function attentionOf(deal: Deal, tasks: Task[], today: string, isClosing: boolean): Attention {
  if (isClosing) return null
  const next = nextTaskOf(deal.id, tasks)
  if (!next) return 'no-next-step'
  return next.dueDate < today ? 'overdue' : null
}

export function tasksOf(dealId: string, tasks: Task[]): Task[] {
  return tasks
    .filter((task) => task.dealId === dealId)
    .sort((a, b) => Number(a.isDone) - Number(b.isDone) || a.dueDate.localeCompare(b.dueDate))
}

export function activitiesOf(dealId: string, activities: Activity[]): Activity[] {
  return activities
    .filter((activity) => activity.dealId === dealId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function userById(users: User[], id: string): User | undefined {
  return users.find((user) => user.id === id)
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

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

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  return dateFormatter.format(new Date(`${isoDate}T00:00:00`))
}

/** «через 3 дня» / «просрочено на 2 дня» — считаем от переданного today, а не от системной даты */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime()
  const to = new Date(`${toIso}T00:00:00`).getTime()
  return Math.round((to - from) / 86_400_000)
}
