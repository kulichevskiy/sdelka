export type UserRole = 'owner' | 'admin' | 'member'

import type { ReactNode } from 'react'

/** Сотрудник, который ведёт клиентов */
export interface User {
  id: string
  name: string
  role: UserRole
}

/** Компания-клиент */
export interface Company {
  id: string
  name: string
  industry: string
  website: string
  phone: string
  ownerId: string
  note: string
  customValues: CustomValues
}

export type CustomValues = Record<string, string | number | null>
export type FieldEntity = 'deal' | 'contact' | 'company'
export type FieldType = 'text' | 'number' | 'date' | 'select'

export interface CustomField {
  id: string
  name: string
  entity: FieldEntity
  type: FieldType
  isRequired: boolean
  options: string[]
}

/** Контактное лицо */
export interface Contact {
  id: string
  name: string
  position: string
  companyId: string
  email: string
  phone: string
  ownerId: string
  customValues: CustomValues
}

/** Сделка в объёме, нужном карточке: правка полей живёт в разделе «Сделки» */
export interface RelatedDeal {
  id: string
  title: string
  companyId: string
  contactId: string
  stageName: string
  amount: number
  currency: string
  /** Незакрытые сделки считаются активными и попадают в счётчик строки списка */
  isActive: boolean
}

/** Тип состоявшегося взаимодействия */
export type ActivityType = 'call' | 'email' | 'meeting' | 'note'

/** Запись о взаимодействии: всегда привязана к компании, часто — к конкретному человеку */
export interface Activity {
  id: string
  companyId: string
  contactId: string | null
  type: ActivityType
  authorId: string
  /** ISO-дата (YYYY-MM-DD) */
  date: string
  note: string
}

/** Активная вкладка раздела */
export type ContactsTab = 'contacts' | 'companies'

/** Поля контакта, доступные для правки в панели */
export interface ContactPatch {
  name?: string
  position?: string
  companyId?: string
  email?: string
  phone?: string
  ownerId?: string
  customValues?: CustomValues
}

/** Поля компании, доступные для правки в панели */
export interface CompanyPatch {
  name?: string
  industry?: string
  website?: string
  phone?: string
  ownerId?: string
  note?: string
  customValues?: CustomValues
}

/** Черновик новой активности */
export interface ActivityDraft {
  type: ActivityType
  note: string
}

export interface ContactsProps {
  contacts: Contact[]
  companies: Company[]
  deals: RelatedDeal[]
  activities: Activity[]
  users: User[]
  /** Кто смотрит раздел — подставляется ответственным при создании */
  currentUserId: string
  /** Сегодняшняя дата (YYYY-MM-DD): от неё считается давность последнего контакта */
  today: string
  customFields?: CustomField[]
  /** Открыть карточку сразу при входе — переход из поиска */
  initialContactId?: string | null
  initialCompanyId?: string | null
  /** Вкладка при входе */
  initialTab?: ContactsTab
  /** Пустые состояния: контактов нет / компаний нет */
  emptyContacts?: ReactNode
  emptyCompanies?: ReactNode
  /** Открывает карточку контакта в боковой панели */
  onOpenContact?: (contactId: string) => void
  /** Открывает карточку компании в боковой панели */
  onOpenCompany?: (companyId: string) => void
  /** Запрос на создание контакта или компании — в зависимости от активной вкладки */
  onCreate?: (tab: ContactsTab) => void
  /** Сохранение изменённых полей контакта */
  onUpdateContact?: (contactId: string, patch: ContactPatch) => void
  /** Сохранение изменённых полей компании */
  onUpdateCompany?: (companyId: string, patch: CompanyPatch) => void
  /** Запись активности; contactId пуст, если разговор шёл с компанией в целом */
  onLogActivity?: (companyId: string, contactId: string | null, activity: ActivityDraft) => void
  /** Создание сделки с уже подставленными клиентом и компанией */
  onCreateDeal?: (companyId: string, contactId: string | null) => void
  /** Переход к сделке в разделе «Сделки» */
  onOpenDeal?: (dealId: string) => void
}
