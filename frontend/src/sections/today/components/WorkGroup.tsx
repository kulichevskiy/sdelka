import type { ReactNode } from 'react'

interface WorkGroupProps {
  title: string
  count: number
  tone: 'urgent' | 'neutral' | 'warning'
  /** Пояснение под заголовком — зачем эта группа существует */
  hint?: string
  children: ReactNode
}

const toneClasses: Record<WorkGroupProps['tone'], string> = {
  urgent: 'text-red-600 dark:text-red-400',
  neutral: 'text-stone-500 dark:text-stone-400',
  warning: 'text-amber-700 dark:text-amber-500',
}

const countClasses: Record<WorkGroupProps['tone'], string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  neutral: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
}

export function WorkGroup({ title, count, tone, hint, children }: WorkGroupProps) {
  return (
    <section className="mt-6 first:mt-0">
      <header className="mb-2 flex items-baseline gap-2">
        <h2
          className={`text-[11px] font-semibold tracking-wider uppercase ${toneClasses[tone]}`}
        >
          {title}
        </h2>
        <span
          className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${countClasses[tone]}`}
        >
          {count}
        </span>
        {hint && (
          <span className="ml-auto text-xs text-stone-400 dark:text-stone-600">{hint}</span>
        )}
      </header>
      <ul className="flex flex-col">{children}</ul>
    </section>
  )
}
