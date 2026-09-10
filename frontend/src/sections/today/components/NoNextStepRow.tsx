import { useState } from 'react'
import { ArrowRight, Plus, X } from 'lucide-react'
import type { NextStepDraft, TodayDeal } from '../types'
import { DatePicker } from './DatePicker'
import { formatMoney, nextDay } from './today-utils'
import { EXIT_MS, useEnterTransition } from './transitions'

interface NoNextStepRowProps {
  deal: TodayDeal
  today: string
  /** Порядковый номер в группе — задаёт лесенку появления при загрузке */
  index?: number
  onAddNextStep?: (task: NextStepDraft) => void
  onOpenDeal?: () => void
}

export function NoNextStepRow({
  deal,
  today,
  index = 0,
  onAddNextStep,
  onOpenDeal,
}: NoNextStepRowProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(nextDay(today))
  const enterRef = useEnterTransition(Math.min(index, 6) * 30)

  function submit() {
    if (!title.trim()) return
    const draft = { title: title.trim(), dueDate }
    // Шаг поставлен — сделка уходит из группы: сначала сворачиваем строку
    setIsLeaving(true)
    window.setTimeout(() => onAddNextStep?.(draft), EXIT_MS)
  }

  return (
    <li
      className={[
        'grid transition-all ease-out',
        isLeaving
          ? 'grid-rows-[0fr] opacity-0 duration-200'
          : 'grid-rows-[1fr] opacity-100 duration-150',
      ].join(' ')}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          ref={enterRef}
          className="group mb-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/40 p-3 transition-colors duration-150 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/20"
        >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpenDeal}
          className="flex min-w-0 flex-1 flex-col items-start text-left"
        >
          <span className="flex max-w-full items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
            <span className="truncate">{deal.title}</span>
            <ArrowRight
              className="size-3.5 shrink-0 -transtone-x-1 text-stone-400 opacity-0 transition-all duration-150 group-hover:transtone-x-0 group-hover:opacity-100"
              aria-hidden="true"
            />
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
            {deal.companyName}
            <span className="text-stone-300 dark:text-stone-700">·</span>
            {deal.stageName}
            <span className="text-stone-300 dark:text-stone-700">·</span>
            <span className="font-mono tabular-nums">{formatMoney(deal.amount, deal.currency)}</span>
          </span>
        </button>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 dark:bg-brand-500 dark:text-white px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-150 hover:bg-brand-700 dark:hover:bg-brand-400 active:scale-95"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Поставить шаг
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
              if (event.key === 'Escape') setIsAdding(false)
            }}
            placeholder="Что сделать дальше?"
            aria-label="Следующий шаг"
            className="min-w-40 flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
          <DatePicker
            value={dueDate}
            today={today}
            onChange={setDueDate}
            ariaLabel="Дата следующего шага"
            className="w-32"
          />
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-brand-600 dark:bg-brand-500 dark:text-white px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 dark:hover:bg-brand-400 active:scale-95"
          >
            Добавить
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            aria-label="Отмена"
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
        </div>
      </div>
    </li>
  )
}
