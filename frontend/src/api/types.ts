/**
 * Типы API по docs/api-contract.md. Написаны руками, пока бэкенд не отдаёт
 * openapi.json; после `npm run gen:api` можно сверить со schema.d.ts.
 */

export type Role = 'owner' | 'admin' | 'member'
export type UserStatus = 'active' | 'invited' | 'disabled'
export type Currency = 'RUB' | 'USD' | 'EUR'
export type DealOutcome = 'won' | 'lost'
export type ActivityType = 'call' | 'email' | 'meeting' | 'note'
export type FieldEntity = 'deal' | 'contact' | 'company'
export type FieldType = 'text' | 'number' | 'date' | 'select'
export type CustomValues = Record<string, string | number | null>
export type OnboardingKey = 'deal' | 'contact' | 'invite' | 'pipeline' | 'task'
export type PipelineTemplate = 'standard' | 'empty'

export interface Onboarding {
  dismissed: boolean
  items: Array<{ key: OnboardingKey; done: boolean }>
  hasDemoData: boolean
}

export interface Org {
  id: string
  name: string
  currency: Currency
  createdAt: string
}

export interface Me {
  user: { id: string; name: string; email: string; role: Role }
  org: Org
  onboarding: Onboarding
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  createdAt: string
}

export interface Stage {
  id: string
  name: string
  order: number
  isClosing: boolean
}

export interface Company {
  id: string
  name: string
  industry: string
  website: string
  phone: string
  ownerId: string
  note: string
  customValues: CustomValues
  createdAt: string
}

export interface Contact {
  id: string
  name: string
  position: string
  companyId: string
  email: string
  phone: string
  ownerId: string
  customValues: CustomValues
  createdAt: string
}

export interface Deal {
  id: string
  title: string
  companyId: string
  contactId: string | null
  ownerId: string
  stageId: string
  amount: number
  expectedCloseDate: string | null
  createdAt: string
  outcome: DealOutcome | null
  lostReason: string | null
  description: string
  customValues: CustomValues
}

export interface Task {
  id: string
  dealId: string
  title: string
  dueDate: string
  isDone: boolean
  assigneeId: string
}

export interface Activity {
  id: string
  companyId: string
  contactId: string | null
  dealId: string | null
  type: ActivityType
  authorId: string
  date: string
  note: string
}

export interface CustomField {
  id: string
  name: string
  entity: FieldEntity
  type: FieldType
  isRequired: boolean
  options: string[]
  order: number
}

export interface LossReason {
  id: string
  name: string
  usageCount: number
}

// ---- Тела запросов ----

export interface RegisterBody {
  name: string
  email: string
  password: string
  orgName: string
  currency: Currency
  pipelineTemplate: PipelineTemplate
}

export interface InviteInfo {
  email: string
  orgName: string
  inviterName: string
  role: Role
}

export interface InviteResult {
  user: User
  inviteUrl: string | null
}

export interface DealCreate {
  title: string
  companyId: string
  contactId?: string | null
  amount?: number
  ownerId?: string
  expectedCloseDate?: string | null
  description?: string
  customValues?: CustomValues
}

export type DealPatch = Partial<
  Pick<
    Deal,
    | 'title'
    | 'companyId'
    | 'contactId'
    | 'ownerId'
    | 'amount'
    | 'expectedCloseDate'
    | 'description'
    | 'customValues'
  >
>

export interface DealMove {
  stageId: string
  outcome?: DealOutcome
  lostReason?: string
}

export type CompanyPatch = Partial<Omit<Company, 'id' | 'createdAt'>>
export type ContactPatch = Partial<Omit<Contact, 'id' | 'createdAt'>>
export type TaskPatch = Partial<Pick<Task, 'title' | 'dueDate' | 'isDone' | 'assigneeId'>>

export interface ActivityCreate {
  companyId: string
  contactId?: string | null
  dealId?: string | null
  type: ActivityType
  note: string
  date?: string
}

export interface CustomFieldCreate {
  name: string
  entity: FieldEntity
  type: FieldType
  isRequired: boolean
  options?: string[]
}
