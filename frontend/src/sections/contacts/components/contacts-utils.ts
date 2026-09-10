import type {
  Activity,
  Company,
  Contact,
  RelatedDeal,
  User,
} from '../types'

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
const dateWithYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(isoDate: string | null | undefined, today: string): string {
  if (!isoDate) return '—'
  const date = new Date(`${isoDate}T00:00:00`)
  const sameYear = isoDate.slice(0, 4) === today.slice(0, 4)
  return sameYear ? shortDate.format(date) : dateWithYear.format(date)
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime()
  const to = new Date(`${toIso}T00:00:00`).getTime()
  return Math.round((to - from) / 86_400_000)
}

/** Клиент считается остывшим, если не общались больше полутора месяцев */
export const STALE_DAYS = 45

/** «3 месяца» / «45 дней» — для подписи о давности общения */
export function agoLabel(days: number): string {
  if (days >= 60) {
    const months = Math.round(days / 30)
    const lastTwo = months % 100
    const last = months % 10
    const word =
      lastTwo >= 11 && lastTwo <= 14
        ? 'месяцев'
        : last === 1
          ? 'месяц'
          : last >= 2 && last <= 4
            ? 'месяца'
            : 'месяцев'
    return `${months} ${word}`
  }
  const lastTwo = days % 100
  const last = days % 10
  const word =
    lastTwo >= 11 && lastTwo <= 14 ? 'дней' : last === 1 ? 'день' : last >= 2 && last <= 4 ? 'дня' : 'дней'
  return `${days} ${word}`
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function userById(users: User[], id: string): User | undefined {
  return users.find((user) => user.id === id)
}

export function companyById(companies: Company[], id: string): Company | undefined {
  return companies.find((company) => company.id === id)
}

export function contactsOfCompany(contacts: Contact[], companyId: string): Contact[] {
  return contacts.filter((contact) => contact.companyId === companyId)
}

/** Лента контакта — только его разговоры; лента компании — все разговоры компании */
export function activitiesOfContact(activities: Activity[], contactId: string): Activity[] {
  return activities
    .filter((activity) => activity.contactId === contactId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function activitiesOfCompany(activities: Activity[], companyId: string): Activity[] {
  return activities
    .filter((activity) => activity.companyId === companyId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function dealsOfContact(deals: RelatedDeal[], contactId: string): RelatedDeal[] {
  return deals.filter((deal) => deal.contactId === contactId)
}

export function dealsOfCompany(deals: RelatedDeal[], companyId: string): RelatedDeal[] {
  return deals.filter((deal) => deal.companyId === companyId)
}

export interface DealsSummary {
  activeCount: number
  activeAmount: number
  currency: string
}

export function summarize(deals: RelatedDeal[]): DealsSummary {
  const active = deals.filter((deal) => deal.isActive)
  return {
    activeCount: active.length,
    activeAmount: active.reduce((sum, deal) => sum + deal.amount, 0),
    currency: deals[0]?.currency ?? 'RUB',
  }
}

/** Дата последнего взаимодействия или null, если общения не было ни разу */
export function lastContactDate(activities: Activity[]): string | null {
  return activities.length > 0 ? activities[0].date : null
}
