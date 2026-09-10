import type { ReactNode } from 'react'

export type UserRole = 'owner' | 'admin' | 'member'

/** Сотрудник, открывший рабочий стол */
export interface CurrentUser {
  id: string
  name: string
  role: UserRole
}

/** Сделка в объёме, нужном рабочему столу: правка полей живёт в разделе «Сделки» */
export interface TodayDeal {
  id: string
  title: string
  companyName: string
  stageName: string
  amount: number
  currency: string
  ownerId: string
}

/** Задача — следующий шаг по сделке */
export interface TodayTask {
  id: string
  dealId: string
  title: string
  /** ISO-дата (YYYY-MM-DD) */
  dueDate: string
  isDone: boolean
  assigneeId: string
}

/** Группа рабочего стола, в которую попадает запись */
export type TodayGroup = 'overdue' | 'today' | 'no-next-step'

/** Черновик следующего шага для сделки, у которой его нет */
export interface NextStepDraft {
  title: string
  /** ISO-дата (YYYY-MM-DD) */
  dueDate: string
}

export interface TodayProps {
  currentUser: CurrentUser
  deals: TodayDeal[]
  tasks: TodayTask[]
  /** Сегодняшняя дата (YYYY-MM-DD): от неё считается просрочка */
  today: string
  /** Блок над списком — чеклист запуска */
  header?: ReactNode
  /** Что показать, когда у пользователя нет ни одной открытой сделки */
  emptyState?: ReactNode
  /** Отметка задачи выполненной или снятие отметки */
  onToggleTask?: (taskId: string, isDone: boolean) => void
  /** Перенос срока задачи на другую дату */
  onRescheduleTask?: (taskId: string, dueDate: string) => void
  /** Постановка следующего шага сделке, у которой его нет */
  onAddNextStep?: (dealId: string, task: NextStepDraft) => void
  /** Переход к сделке в разделе «Сделки» */
  onOpenDeal?: (dealId: string) => void
}
