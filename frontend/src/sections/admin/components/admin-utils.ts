import type { FieldEntity, FieldType, UserStatus } from '../types'

export const entityLabels: Record<FieldEntity, string> = {
  deal: 'Сделка',
  contact: 'Контакт',
  company: 'Компания',
}

export const typeLabels: Record<FieldType, string> = {
  text: 'Текст',
  number: 'Число',
  date: 'Дата',
  select: 'Список',
}

export const statusLabels: Record<UserStatus, string> = {
  active: 'Активен',
  invited: 'Приглашён, не вошёл',
  disabled: 'Доступ отключён',
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

export function dealsLabel(count: number): string {
  return `${count} ${pluralize(count, 'сделка', 'сделки', 'сделок')}`
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
