import type { ReactNode } from 'react'

/** Стадия воронки продаж */
export interface Stage {
  id: string
  name: string
  order: number
  /** Последняя стадия: попадание в неё требует выбора исхода сделки */
  isClosing: boolean
}

export type UserRole = 'owner' | 'admin' | 'member'

/** Сотрудник, который ведёт сделки */
export interface User {
  id: string
  name: string
  role: UserRole
  avatarUrl: string | null
}

/** Компания-клиент */
export interface Company {
  id: string
  name: string
}

/** Контактное лицо в компании */
export interface Contact {
  id: string
  name: string
  position: string
  companyId: string
}

/** Исход закрытой сделки */
export type DealOutcome = 'won' | 'lost'

/** Сделка — потенциальная продажа */
export interface Deal {
  id: string
  title: string
  companyId: string
  contactId: string | null
  ownerId: string
  stageId: string
  amount: number
  currency: string
  /** Ожидаемая дата закрытия, ISO-дата (YYYY-MM-DD) */
  expectedCloseDate: string
  createdAt: string
  /** Заполнен только для сделок на закрывающей стадии */
  outcome: DealOutcome | null
  /** Причина проигрыша, только для outcome === 'lost' */
  lostReason: string | null
  description: string
  /** Значения дополнительных полей по id поля */
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

/** Задача по сделке — следующий шаг с датой */
export interface Task {
  id: string
  dealId: string
  title: string
  /** ISO-дата (YYYY-MM-DD) */
  dueDate: string
  isDone: boolean
  assigneeId: string
}

/** Тип состоявшегося взаимодействия */
export type ActivityType = 'call' | 'email' | 'meeting' | 'note'

/** Запись о взаимодействии по сделке */
export interface Activity {
  id: string
  dealId: string
  type: ActivityType
  authorId: string
  /** ISO-дата (YYYY-MM-DD) */
  date: string
  note: string
}

/** Режим отображения сделок */
export type DealsViewMode = 'board' | 'table'

/** Поля, доступные для правки в панели сделки */
export interface DealPatch {
  title?: string
  companyId?: string
  contactId?: string
  ownerId?: string
  amount?: number
  expectedCloseDate?: string
  description?: string
  customValues?: CustomValues
}

/** Черновик новой задачи */
export interface TaskDraft {
  title: string
  dueDate: string
  assigneeId: string
}

/** Черновик новой активности */
export interface ActivityDraft {
  type: ActivityType
  note: string
}

export interface DealsProps {
  /** Валюта организации: пустая доска тоже должна показывать правильный знак */
  currency?: string
  /** Сделка, открытая сразу при входе — переход из другого раздела */
  initialDealId?: string | null
  deals: Deal[]
  stages: Stage[]
  users: User[]
  companies: Company[]
  contacts: Contact[]
  tasks: Task[]
  activities: Activity[]
  /** Кто смотрит раздел — для фильтра «Мои сделки» */
  currentUserId: string
  /** Сегодняшняя дата (YYYY-MM-DD) для расчёта просрочки */
  today: string
  /** Дополнительные поля сделки из настроек организации */
  customFields?: CustomField[]
  /** Справочник причин проигрыша для диалога закрытия */
  lossReasons?: string[]
  /** Что показать, когда сделок нет вовсе (не из-за фильтров) */
  emptyState?: ReactNode
  /** Действия над всеми сделками, не зависящие от фильтров доски */
  toolbarActions?: ReactNode
  /** Открывает сделку в боковой панели */
  onOpenDeal?: (dealId: string) => void
  /** Перенос сделки на другую стадию; outcome передаётся при переносе на закрывающую стадию */
  onMoveDeal?: (dealId: string, stageId: string, outcome?: DealOutcome, lostReason?: string) => void
  /** Запрос на создание новой сделки */
  onCreateDeal?: () => void
  /** Сохранение изменённых полей сделки */
  onUpdateDeal?: (dealId: string, patch: DealPatch) => void
  /** Добавление задачи (следующего шага) к сделке */
  onAddTask?: (dealId: string, task: TaskDraft) => void
  /** Отметка задачи выполненной или снятие отметки */
  onToggleTask?: (taskId: string, isDone: boolean) => void
  /** Запись активности по сделке */
  onLogActivity?: (dealId: string, activity: ActivityDraft) => void
}
