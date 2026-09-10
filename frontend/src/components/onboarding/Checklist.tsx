import { Check, ChevronRight, Sparkles, X } from 'lucide-react'
import type { Onboarding, OnboardingKey } from '@/api/types'

export interface ChecklistStep {
  key: OnboardingKey
  title: string
  hint: string
  actionLabel: string
  onAction: () => void
}

interface ChecklistProps {
  onboarding: Onboarding
  steps: ChecklistStep[]
  canAdmin: boolean
  onLoadDemo?: () => void
  isLoadingDemo?: boolean
  onDismiss?: () => void
}

function doneCount(onboarding: Onboarding) {
  return onboarding.items.filter((item) => item.done).length
}

/** Полный чеклист запуска: показывается на «Сегодня», пока не скрыт и не выполнен */
export function OnboardingChecklist({ onboarding, steps, canAdmin, onLoadDemo, isLoadingDemo, onDismiss }: ChecklistProps) {
  const done = doneCount(onboarding)
  const total = onboarding.items.length
  const doneKeys = new Set(onboarding.items.filter((item) => item.done).map((item) => item.key))

  return (
    <section
      aria-label="Чеклист запуска"
      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-stone-900 dark:text-stone-100">
            <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
            Первые шаги
          </h2>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {done === total ? 'Всё готово, можно работать' : `${done} из ${total} — заполним систему, чтобы было с чем работать`}
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Скрыть чеклист"
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-500 dark:bg-stone-100"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>

      <ol className="mt-4 flex flex-col divide-y divide-stone-100 dark:divide-stone-800">
        {steps.map((step) => {
          const isDone = doneKeys.has(step.key)
          return (
            <li key={step.key} className="flex items-center gap-3 py-2.5">
              <span
                className={[
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                  isDone
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-stone-300 text-stone-400 dark:border-stone-700',
                ].join(' ')}
              >
                {isDone && <Check className="size-3.5" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={[
                    'block text-sm',
                    isDone ? 'text-stone-400 line-through dark:text-stone-600' : 'font-medium text-stone-900 dark:text-stone-100',
                  ].join(' ')}
                >
                  {step.title}
                </span>
                {!isDone && <span className="block text-xs text-stone-500 dark:text-stone-400">{step.hint}</span>}
              </span>
              {!isDone && (
                <button
                  type="button"
                  onClick={step.onAction}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  {step.actionLabel}
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {canAdmin && !onboarding.hasDemoData && onLoadDemo && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-900">
          <p className="min-w-0 flex-1 text-xs text-stone-600 dark:text-stone-400">
            Хотите сначала посмотреть, как всё выглядит с данными? Демо-набор можно удалить одной кнопкой в админке.
          </p>
          <button
            type="button"
            onClick={onLoadDemo}
            disabled={isLoadingDemo}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
          >
            {isLoadingDemo ? 'Заполняем…' : 'Заполнить демо-данными'}
          </button>
        </div>
      )}
    </section>
  )
}

/** Компактная версия для сайдбара: прогресс и следующий шаг */
export function OnboardingSidebarCard({
  onboarding,
  steps,
  onOpen,
}: {
  onboarding: Onboarding
  steps: ChecklistStep[]
  onOpen: () => void
}) {
  const done = doneCount(onboarding)
  const total = onboarding.items.length
  const doneKeys = new Set(onboarding.items.filter((item) => item.done).map((item) => item.key))
  const next = steps.find((step) => !doneKeys.has(step.key))
  if (!next) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800"
    >
      <span className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-stone-500 uppercase dark:text-stone-400">
        Первые шаги
        <span className="tabular-nums">
          {done}/{total}
        </span>
      </span>
      <span className="mt-2 block h-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <span className="block h-full rounded-full bg-brand-600 dark:bg-brand-400" style={{ width: `${(done / total) * 100}%` }} />
      </span>
      <span className="mt-2 block truncate text-xs text-stone-700 dark:text-stone-300">Дальше: {next.title.toLowerCase()}</span>
    </button>
  )
}
