import { useState } from 'react'
import { ArrowRight, CalendarClock } from 'lucide-react'
import type { TodayDeal, TodayTask } from '../types'
import { DatePicker } from './DatePicker'
import { daysBetween, formatShortDate, nextDay, overdueLabel } from './today-utils'
import { EXIT_MS, useEnterTransition } from './transitions'

interface TaskRowProps {
  task: TodayTask
  deal?: TodayDeal
  today: string
  /** Порядковый номер в группе — задаёт лесенку появления при загрузке */
  index?: number
  onToggle?: (isDone: boolean) => void
  onReschedule?: (dueDate: string) => void
  onOpenDeal?: () => void
}

export function TaskRow({
  task,
  deal,
  today,
  index = 0,
  onToggle,
  onReschedule,
  onOpenDeal,
}: TaskRowProps) {
  const [isLeaving, setIsLeaving] = useState(false)
  const enterRef = useEnterTransition(Math.min(index, 6) * 30)

  const overdueDays = daysBetween(task.dueDate, today)
  const isOverdue = task.dueDate < today

  /** Любое из этих действий убирает строку из группы — сначала сворачиваем, потом сообщаем наружу */
  function leaveWith(action: () => void) {
    setIsLeaving(true)
    window.setTimeout(action, EXIT_MS)
  }

  return (
    <li
      className={[
        'grid transition-all ease-out',
        isLeaving ? 'grid-rows-[0fr] opacity-0 duration-200' : 'grid-rows-[1fr] opacity-100 duration-150',
      ].join(' ')}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          ref={enterRef}
          className={[
            'group mb-2 flex items-start gap-3 rounded-lg border p-3 transition-[border-color,box-shadow,transform] duration-150',
            'hover:border-stone-300 hover:shadow-xs dark:hover:border-stone-700',
            isLeaving ? 'scale-[0.99]' : '',
            isOverdue
              ? 'border-red-200 bg-red-50/40 dark:border-red-950 dark:bg-red-950/20'
              : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950',
          ].join(' ')}
        >
          <input
            type="checkbox"
            checked={task.isDone || isLeaving}
            onChange={(event) => {
              const isDone = event.target.checked
              if (isDone) leaveWith(() => onToggle?.(true))
              else onToggle?.(false)
            }}
            aria-label={`Выполнено: ${task.title}`}
            className="mt-0.5 size-4.5 shrink-0 cursor-pointer accent-brand-600 transition-transform active:scale-90"
          />

          <div className="min-w-0 flex-1">
            <p
              className={[
                'text-sm leading-snug font-medium transition-colors duration-200',
                isLeaving
                  ? 'text-stone-400 line-through dark:text-stone-600'
                  : 'text-stone-900 dark:text-stone-100',
              ].join(' ')}
            >
              {task.title}
            </p>

            {deal && (
              <button
                type="button"
                onClick={onOpenDeal}
                className="mt-1 flex max-w-full items-center gap-1.5 text-xs text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-400"
              >
                <span className="truncate">{deal.title}</span>
                <span className="text-stone-300 dark:text-stone-700">·</span>
                <span className="truncate">{deal.companyName}</span>
                <ArrowRight
                  className="size-3 shrink-0 -transtone-x-1 opacity-0 transition-all duration-150 group-hover:transtone-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </button>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={[
                  'inline-flex items-center gap-1 text-xs tabular-nums',
                  isOverdue
                    ? 'font-semibold text-red-600 dark:text-red-400'
                    : 'text-stone-400 dark:text-stone-500',
                ].join(' ')}
              >
                <CalendarClock className="size-3.5" aria-hidden="true" />
                {formatShortDate(task.dueDate)}
                {isOverdue && ` · ${overdueLabel(overdueDays)}`}
              </span>

              <span className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => leaveWith(() => onReschedule?.(nextDay(today)))}
                  className="rounded-md px-1.5 py-0.5 text-xs text-stone-500 transition-all duration-150 hover:bg-stone-100 hover:text-stone-900 active:scale-95 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                  Завтра
                </button>
                <DatePicker
                  value={task.dueDate}
                  today={today}
                  onChange={(dueDate) => leaveWith(() => onReschedule?.(dueDate))}
                  ariaLabel="Перенести на дату"
                  size="sm"
                  className="w-28"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
