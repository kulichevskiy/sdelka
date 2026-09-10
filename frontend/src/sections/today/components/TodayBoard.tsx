import { useMemo } from 'react'
import { CheckCheck } from 'lucide-react'
import type { TodayProps } from '../types'
import { NoNextStepRow } from './NoNextStepRow'
import { TaskRow } from './TaskRow'
import { WorkGroup } from './WorkGroup'
import { dealById, formatLongDate, groupWork, pluralize } from './today-utils'

/** Типографика продукта: Graphik (product/design-system/typography.json), задаётся оболочкой */
export function TodayBoard({
  currentUser,
  deals,
  tasks,
  today,
  header,
  emptyState,
  onToggleTask,
  onRescheduleTask,
  onAddNextStep,
  onOpenDeal,
}: TodayProps) {
  const groups = useMemo(() => groupWork(tasks, deals, today), [tasks, deals, today])

  const todayCount = groups.today.length
  const overdueCount = groups.overdue.length
  const isAllClear =
    overdueCount === 0 && todayCount === 0 && groups.withoutNextStep.length === 0

  const firstName = currentUser.name.split(' ')[0]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Сегодня
          </h1>
          <p className="text-sm text-stone-400 first-letter:uppercase dark:text-stone-500">
            {formatLongDate(today)}
          </p>
        </div>

        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
          {todayCount > 0 ? (
            <>
              <span className="font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                {todayCount}
              </span>{' '}
              {pluralize(todayCount, 'дело', 'дела', 'дел')} на сегодня
            </>
          ) : (
            'На сегодня дел нет'
          )}
          {overdueCount > 0 && (
            <>
              <span className="mx-1.5 text-stone-300 dark:text-stone-700">·</span>
              <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                {overdueCount} просрочено
              </span>
            </>
          )}
        </p>
      </header>

      {header && <div className="mt-6">{header}</div>}

      {deals.length === 0 && emptyState ? (
        <div className="mt-6">{emptyState}</div>
      ) : isAllClear ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
            <CheckCheck className="size-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </span>
          <p className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Всё чисто, {firstName}
          </p>
          <p className="max-w-xs text-sm text-stone-500 dark:text-stone-400">
            Задач на сегодня нет, просрочки тоже, и у каждой вашей сделки есть следующий шаг.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          {groups.overdue.length > 0 && (
            <WorkGroup
              title="Просрочено"
              count={groups.overdue.length}
              tone="urgent"
              hint="Начните отсюда"
            >
              {groups.overdue.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  index={index}
                  deal={dealById(deals, task.dealId)}
                  today={today}
                  onToggle={(isDone) => onToggleTask?.(task.id, isDone)}
                  onReschedule={(dueDate) => onRescheduleTask?.(task.id, dueDate)}
                  onOpenDeal={() => onOpenDeal?.(task.dealId)}
                />
              ))}
            </WorkGroup>
          )}

          {groups.today.length > 0 && (
            <WorkGroup title="На сегодня" count={groups.today.length} tone="neutral">
              {groups.today.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  index={index}
                  deal={dealById(deals, task.dealId)}
                  today={today}
                  onToggle={(isDone) => onToggleTask?.(task.id, isDone)}
                  onReschedule={(dueDate) => onRescheduleTask?.(task.id, dueDate)}
                  onOpenDeal={() => onOpenDeal?.(task.dealId)}
                />
              ))}
            </WorkGroup>
          )}

          {groups.withoutNextStep.length > 0 && (
            <WorkGroup
              title="Без следующего шага"
              count={groups.withoutNextStep.length}
              tone="warning"
              hint="Эти сделки могут потеряться"
            >
              {groups.withoutNextStep.map((deal, index) => (
                <NoNextStepRow
                  key={deal.id}
                  deal={deal}
                  index={index}
                  today={today}
                  onAddNextStep={(task) => onAddNextStep?.(deal.id, task)}
                  onOpenDeal={() => onOpenDeal?.(deal.id)}
                />
              ))}
            </WorkGroup>
          )}
        </div>
      )}
    </div>
  )
}
