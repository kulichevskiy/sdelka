/** Стадия воронки продаж */
export interface Stage {
  id: string
  name: string
  order: number
  /** Сколько сделок сейчас на стадии — предупреждает об удалении непустой */
  dealCount: number
}

export type UserRole = 'owner' | 'admin' | 'member'

/** Состояние доступа сотрудника */
export type UserStatus = 'active' | 'invited' | 'disabled'

/** Сотрудник команды */
export interface TeamUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  /** Нагрузка: сколько сделок ведёт. У приглашённых и отключённых — 0 */
  dealCount: number
}

/** Сущность, к которой относится дополнительное поле */
export type FieldEntity = 'deal' | 'contact' | 'company'

/** Тип дополнительного поля */
export type FieldType = 'text' | 'number' | 'date' | 'select'

/** Дополнительное поле, добавленное командой */
export interface CustomField {
  id: string
  name: string
  entity: FieldEntity
  type: FieldType
  isRequired: boolean
  /** Варианты для типа select; у остальных типов пустой массив */
  options: string[]
}

/** Причина проигрыша из справочника */
export interface LossReason {
  id: string
  name: string
  /** Сколько раз причину уже выбирали при закрытии сделок */
  usageCount: number
}

/** Активная вкладка раздела */
export type AdminTab = 'pipeline' | 'users' | 'fields' | 'loss-reasons' | 'org'

export type Currency = 'RUB' | 'USD' | 'EUR'

export interface OrgSettings {
  name: string
  currency: Currency
  hasDemoData: boolean
}

/** Черновик нового приглашения */
export interface InviteDraft {
  email: string
  role: Exclude<UserRole, 'owner'>
}

/** Черновик нового дополнительного поля */
export interface CustomFieldDraft {
  name: string
  entity: FieldEntity
  type: FieldType
  isRequired: boolean
}

export interface AdminProps {
  stages: Stage[]
  users: TeamUser[]
  customFields: CustomField[]
  lossReasons: LossReason[]
  /** Кто настраивает — себе роль не меняют и доступ не отключают */
  currentUserId: string
  /** Роль настраивающего: admin не правит других admin, owner может всё */
  currentUserRole: UserRole
  /** Вкладка при входе (например, из чеклиста) */
  initialTab?: AdminTab
  org?: OrgSettings
  onUpdateOrg?: (patch: { name?: string; currency?: Currency }) => void
  onLoadDemo?: () => void
  onClearDemo?: () => void
  isDemoPending?: boolean

  /** Смена порядка стадий: id стадии и её новая позиция, начиная с нуля */
  onReorderStage?: (stageId: string, newIndex: number) => void
  /** Переименование стадии */
  onRenameStage?: (stageId: string, name: string) => void
  /** Добавление стадии в конец воронки */
  onAddStage?: (name: string) => void
  /** Удаление стадии */
  onDeleteStage?: (stageId: string) => void

  /** Смена роли сотрудника */
  onChangeUserRole?: (userId: string, role: Exclude<UserRole, 'owner'>) => void
  /** Приглашение нового пользователя по почте; возвращает ссылку, если бэкенд её выдал */
  onInviteUser?: (invite: InviteDraft) => Promise<string | null> | void
  /** Новая ссылка приглашения для того, кто ещё не вошёл */
  onResendInvite?: (userId: string) => Promise<string | null>
  /** Ссылка для сброса пароля активному сотруднику */
  onResetLink?: (userId: string) => Promise<string | null>
  /** Отмена приглашения */
  onCancelInvite?: (userId: string) => void
  /** Передача владения (только owner) */
  onTransferOwnership?: (userId: string) => void
  /** Отключение доступа: запись и её история остаются */
  onDisableUser?: (userId: string) => void
  /** Возврат доступа отключённому сотруднику */
  onEnableUser?: (userId: string) => void

  /** Добавление дополнительного поля */
  onAddField?: (field: CustomFieldDraft) => void
  /** Переключение обязательности поля */
  onToggleFieldRequired?: (fieldId: string, isRequired: boolean) => void
  /** Удаление дополнительного поля */
  onDeleteField?: (fieldId: string) => void
  /** Добавление варианта в поле-список */
  onAddFieldOption?: (fieldId: string, option: string) => void
  /** Удаление варианта из поля-списка */
  onRemoveFieldOption?: (fieldId: string, option: string) => void

  /** Добавление причины проигрыша */
  onAddLossReason?: (name: string) => void
  /** Переименование причины проигрыша */
  onRenameLossReason?: (reasonId: string, name: string) => void
  /** Удаление причины проигрыша */
  onDeleteLossReason?: (reasonId: string) => void
}
