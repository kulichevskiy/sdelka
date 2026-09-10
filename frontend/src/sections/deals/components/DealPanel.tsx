import { roleLabel } from '@/lib/roles'
import { useState } from 'react'
import {
  CalendarDays,
  Check,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  StickyNote,
  Users,
  X,
} from 'lucide-react'
import { CustomFieldsSection } from '@/components/CustomFieldsSection'
import type {
  Activity,
  ActivityDraft,
  ActivityType,
  Company,
  Contact,
  CustomField,
  Deal,
  DealPatch,
  Stage,
  Task,
  TaskDraft,
  User,
} from '../types'
import { DatePicker } from './DatePicker'
import { Select } from './Select'
import { useFadeIn, useSlideInFromRight } from './transitions'
import {
  activitiesOf,
  formatDate,
  formatMoney,
  initialsOf,
  tasksOf,
  userById,
} from './deals-utils'

interface DealPanelProps {
  deal: Deal
  stage?: Stage
  companies: Company[]
  contacts: Contact[]
  users: User[]
  tasks: Task[]
  activities: Activity[]
  today: string
  currentUserId: string
  /** Все стадии — для смены стадии из панели (на телефоне drag-and-drop нет) */
  stages?: Stage[]
  customFields?: CustomField[]
  onChangeStage?: (stageId: string) => void
  onClose: () => void
  onUpdateDeal?: (dealId: string, patch: DealPatch) => void
  onAddTask?: (dealId: string, task: TaskDraft) => void
  onToggleTask?: (taskId: string, isDone: boolean) => void
  onLogActivity?: (dealId: string, activity: ActivityDraft) => void
}

const activityIcons: Record<ActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: StickyNote,
}

const activityLabels: Record<ActivityType, string> = {
  call: 'Звонок',
  email: 'Письмо',
  meeting: 'Встреча',
  note: 'Заметка',
}

const fieldClass =
  'w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100'

const labelClass =
  'text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500'

export function DealPanel({
  deal,
  stage,
  companies,
  contacts,
  users,
  tasks,
  activities,
  today,
  currentUserId,
  stages = [],
  customFields = [],
  onChangeStage,
  onClose,
  onUpdateDeal,
  onAddTask,
  onToggleTask,
  onLogActivity,
}: DealPanelProps) {
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState(today)
  const [activityType, setActivityType] = useState<ActivityType>('call')
  const [activityNote, setActivityNote] = useState('')
  const backdropRef = useFadeIn()
  const panelRef = useSlideInFromRight()

  const dealTasks = tasksOf(deal.id, tasks)
  const dealActivities = activitiesOf(deal.id, activities)
  const companyContacts = contacts.filter((contact) => contact.companyId === deal.companyId)

  function submitTask() {
    if (!taskTitle.trim()) return
    onAddTask?.(deal.id, {
      title: taskTitle.trim(),
      dueDate: taskDate,
      assigneeId: deal.ownerId,
    })
    setTaskTitle('')
    setTaskDate(today)
  }

  function submitActivity() {
    if (!activityNote.trim()) return
    onLogActivity?.(deal.id, { type: activityType, note: activityNote.trim() })
    setActivityNote('')
  }

  return (
    <div className="fixed inset-0 z-40" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-stone-900/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={deal.title}
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-950"
      >
        <header className="flex items-start gap-3 border-b border-stone-200 p-4 dark:border-stone-800">
          <div className="min-w-0 flex-1">
            {stage && stages.length > 1 && onChangeStage ? (
              <Select
                value={stage.id}
                options={stages.map((item) => ({ value: item.id, label: item.name }))}
                onChange={onChangeStage}
                ariaLabel="Стадия сделки"
                size="sm"
                className="-ml-1 mb-1 w-44"
              />
            ) : (
              stage && (
                <span className="text-[11px] font-semibold tracking-wider text-stone-900 uppercase dark:text-stone-200">
                  {stage.name}
                </span>
              )
            )}
            <input
              value={deal.title}
              onChange={(event) => onUpdateDeal?.(deal.id, { title: event.target.value })}
              aria-label="Название сделки"
              className="mt-0.5 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 -ml-1 text-lg font-semibold text-stone-900 hover:border-stone-200 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:text-stone-100 dark:hover:border-stone-800"
            />
            {deal.outcome === 'lost' && deal.lostReason && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Проиграно: {deal.lostReason}
              </p>
            )}
            {deal.outcome === 'won' && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Сделка выиграна</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть панель"
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <section className="grid grid-cols-2 gap-3 border-b border-stone-200 p-4 dark:border-stone-800">
            <label className="col-span-1">
              <span className={labelClass}>Сумма</span>
              <input
                type="number"
                value={deal.amount}
                onChange={(event) =>
                  onUpdateDeal?.(deal.id, { amount: Number(event.target.value) })
                }
                className={`${fieldClass} mt-1 font-mono tabular-nums`}
              />
            </label>

            <div className="col-span-1">
              <span className={labelClass}>Ожидаемое закрытие</span>
              <DatePicker
                value={deal.expectedCloseDate}
                today={today}
                onChange={(expectedCloseDate) => onUpdateDeal?.(deal.id, { expectedCloseDate })}
                ariaLabel="Ожидаемая дата закрытия"
                className="mt-1"
              />
            </div>

            <label className="col-span-1">
              <span className={labelClass}>Компания</span>
              <Select
                value={deal.companyId}
                options={companies.map((company) => ({ value: company.id, label: company.name }))}
                onChange={(companyId) => onUpdateDeal?.(deal.id, { companyId })}
                ariaLabel="Компания"
                className="mt-1"
              />
            </label>

            <label className="col-span-1">
              <span className={labelClass}>Контакт</span>
              <Select
                value={deal.contactId ?? ''}
                options={companyContacts.map((contact) => ({
                  value: contact.id,
                  label: contact.name,
                  hint: contact.position,
                }))}
                onChange={(contactId) => onUpdateDeal?.(deal.id, { contactId })}
                ariaLabel="Контакт"
                placeholder="Нет контактов в компании"
                className="mt-1"
              />
            </label>

            <label className="col-span-2">
              <span className={labelClass}>Ответственный</span>
              <Select
                value={deal.ownerId}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.name,
                  hint: roleLabel(user.role),
                }))}
                onChange={(ownerId) => onUpdateDeal?.(deal.id, { ownerId })}
                ariaLabel="Ответственный"
                className="mt-1"
              />
            </label>

            <label className="col-span-2">
              <span className={labelClass}>Описание</span>
              <textarea
                value={deal.description}
                rows={4}
                onChange={(event) => onUpdateDeal?.(deal.id, { description: event.target.value })}
                className={`${fieldClass} mt-1 resize-y leading-relaxed`}
              />
            </label>
          </section>

          <CustomFieldsSection
            fields={customFields}
            values={deal.customValues ?? {}}
            onChange={(customValues) => onUpdateDeal?.(deal.id, { customValues })}
          />

          <section className="border-b border-stone-200 p-4 dark:border-stone-800">
            <h3 className={labelClass}>Задачи</h3>

            <ul className="mt-2 flex flex-col gap-1">
              {dealTasks.map((task) => {
                const isOverdue = !task.isDone && task.dueDate < today
                return (
                  <li key={task.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-stone-50 dark:hover:bg-stone-900">
                      <input
                        type="checkbox"
                        checked={task.isDone}
                        onChange={(event) => onToggleTask?.(task.id, event.target.checked)}
                        className="mt-0.5 size-4 shrink-0 accent-stone-800"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={[
                            'block text-sm',
                            task.isDone
                              ? 'text-stone-400 line-through dark:text-stone-600'
                              : 'text-stone-800 dark:text-stone-200',
                          ].join(' ')}
                        >
                          {task.title}
                        </span>
                        <span
                          className={[
                            'mt-0.5 flex items-center gap-1 text-xs tabular-nums',
                            isOverdue
                              ? 'font-medium text-red-600 dark:text-red-400'
                              : 'text-stone-400 dark:text-stone-500',
                          ].join(' ')}
                        >
                          <CalendarDays className="size-3" aria-hidden="true" />
                          {formatDate(task.dueDate)}
                          {isOverdue && ' · просрочено'}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}

              {dealTasks.length === 0 && (
                <li className="rounded-lg border border-dashed border-amber-300 p-3 text-xs text-amber-700 dark:border-amber-800 dark:text-amber-500">
                  У сделки нет следующего шага. Добавьте задачу, чтобы она не потерялась.
                </li>
              )}
            </ul>

            <div className="mt-3 flex gap-2">
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && submitTask()}
                placeholder="Следующий шаг"
                className={`${fieldClass} flex-1`}
              />
              <DatePicker
                value={taskDate}
                today={today}
                onChange={setTaskDate}
                ariaLabel="Дата задачи"
                className="w-32 shrink-0"
              />
              <button
                type="button"
                onClick={submitTask}
                aria-label="Добавить задачу"
                className="shrink-0 rounded-lg bg-stone-900 dark:bg-stone-100 dark:text-stone-900 px-2.5 text-white transition-all duration-150 hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-95"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
          </section>

          <section className="p-4">
            <h3 className={labelClass}>Активности</h3>

            <div className="mt-2 rounded-lg border border-stone-200 p-2 dark:border-stone-800">
              <div className="flex gap-1">
                {(Object.keys(activityLabels) as ActivityType[]).map((type) => {
                  const Icon = activityIcons[type]
                  const isActive = activityType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActivityType(type)}
                      className={[
                        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                          : 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800',
                      ].join(' ')}
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                      {activityLabels[type]}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={activityNote}
                  onChange={(event) => setActivityNote(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && submitActivity()}
                  placeholder="Что произошло?"
                  className={`${fieldClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={submitActivity}
                  className="shrink-0 rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Записать
                </button>
              </div>
            </div>

            <ol className="mt-3 flex flex-col">
              {dealActivities.map((activity, index) => {
                const Icon = activityIcons[activity.type]
                const author = userById(users, activity.authorId)
                const isLast = index === dealActivities.length - 1
                return (
                  <li key={activity.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-900 dark:text-stone-400">
                        <Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      {!isLast && <span className="w-px flex-1 bg-stone-200 dark:bg-stone-800" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-stone-400 dark:text-stone-500">
                        <span className="font-medium text-stone-600 dark:text-stone-300">
                          {activityLabels[activity.type]}
                        </span>
                        <span className="tabular-nums">{formatDate(activity.date)}</span>
                        {author && <span>{author.name}</span>}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                        {activity.note}
                      </p>
                    </div>
                  </li>
                )
              })}

              {dealActivities.length === 0 && (
                <li className="flex items-center gap-2 py-3 text-xs text-stone-400 dark:text-stone-600">
                  <MessageSquare className="size-4" aria-hidden="true" />
                  Взаимодействий пока не было
                </li>
              )}
            </ol>
          </section>
        </div>

        <footer className="flex items-center gap-2 border-t border-stone-200 px-4 py-3 text-xs text-stone-400 dark:border-stone-800 dark:text-stone-500">
          <Check className="size-3.5" aria-hidden="true" />
          Изменения сохраняются сразу
          {deal.ownerId === currentUserId && (
            <span className="ml-auto flex items-center gap-1.5">
              <span className="flex size-5 items-center justify-center rounded-full bg-stone-200 text-[9px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                {initialsOf(userById(users, deal.ownerId)?.name ?? '')}
              </span>
              Ваша сделка
            </span>
          )}
          <span className={deal.ownerId === currentUserId ? 'hidden' : 'ml-auto font-mono tabular-nums'}>
            {formatMoney(deal.amount, deal.currency)}
          </span>
        </footer>
      </aside>
    </div>
  )
}
