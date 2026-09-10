import { AlertTriangle, CheckCircle2, CircleSlash, Clock } from 'lucide-react'
import type { Company, Deal, Task, User } from '../types'
import {
  attentionOf,
  formatDate,
  formatMoney,
  initialsOf,
  nextTaskOf,
} from './deals-utils'

interface DealCardProps {
  deal: Deal
  company?: Company
  owner?: User
  tasks: Task[]
  today: string
  isClosingStage: boolean
  isDragging?: boolean
  onOpen?: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function DealCard({
  deal,
  company,
  owner,
  tasks,
  today,
  isClosingStage,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: DealCardProps) {
  const next = nextTaskOf(deal.id, tasks)
  const attention = attentionOf(deal, tasks, today, isClosingStage)
  const isLost = deal.outcome === 'lost'

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen?.()
        }
      }}
      tabIndex={0}
      role="button"
      className={[
        'group cursor-grab rounded-lg border bg-white p-3 text-left shadow-xs transition-all',
        'hover:-transtone-y-px hover:border-stone-300 hover:shadow-md',
        'focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none',
        'active:cursor-grabbing dark:bg-stone-950',
        isDragging ? 'opacity-40' : '',
        attention === 'overdue'
          ? 'border-red-200 dark:border-red-900'
          : 'border-stone-200 dark:border-stone-800',
        isLost ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm leading-snug font-semibold text-stone-900 dark:text-stone-100">
          {deal.title}
        </h3>
        {deal.outcome === 'won' && (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Выиграно" />
        )}
        {isLost && (
          <CircleSlash className="mt-0.5 size-4 shrink-0 text-stone-400" aria-label="Проиграно" />
        )}
      </div>

      <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">{company?.name}</p>

      <p className="mt-2 font-mono text-sm tabular-nums text-stone-900 dark:text-stone-100">
        {formatMoney(deal.amount, deal.currency)}
      </p>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-stone-100 pt-2.5 dark:border-stone-800">
        <div className="min-w-0 flex-1">
          {attention === 'no-next-step' ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-amber-300 px-1.5 py-0.5 text-xs text-amber-700 dark:border-amber-800 dark:text-amber-500">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              Нет следующего шага
            </span>
          ) : next ? (
            <span
              className={[
                'flex items-start gap-1.5 text-xs',
                attention === 'overdue'
                  ? 'font-medium text-red-600 dark:text-red-400'
                  : 'text-stone-500 dark:text-stone-400',
              ].join(' ')}
            >
              <Clock className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="line-clamp-2">{next.title}</span>
                <span className="mt-0.5 block tabular-nums">{formatDate(next.dueDate)}</span>
              </span>
            </span>
          ) : (
            <span className="text-xs text-stone-400 dark:text-stone-600">
              {deal.outcome === 'won' ? 'Сделка выиграна' : 'Сделка закрыта'}
            </span>
          )}
        </div>

        {owner && (
          <span
            title={owner.name}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300"
          >
            {initialsOf(owner.name)}
          </span>
        )}
      </div>
    </article>
  )
}
