import type { ReactNode } from 'react'
import { formatMoney } from './deals-utils'

interface BoardColumnProps {
  name: string
  count: number
  total: number
  currency: string
  isDropTarget?: boolean
  isEmpty?: boolean
  children: ReactNode
  onDragOver?: (event: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: () => void
}

export function BoardColumn({
  name,
  count,
  total,
  currency,
  isDropTarget,
  isEmpty,
  children,
  onDragOver,
  onDragLeave,
  onDrop,
}: BoardColumnProps) {
  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        // max-h-full + min-h-0: колонка не выше доски, длинный список прокручивается внутри неё
        'flex max-h-full min-h-0 w-[calc(100vw-2rem)] shrink-0 snap-center flex-col rounded-xl border transition-colors sm:w-72 sm:snap-align-none',
        isDropTarget
          ? 'border-stone-400 bg-stone-200/60 dark:border-stone-700 dark:bg-stone-800/60'
          : 'border-stone-200 bg-stone-100/60 dark:border-stone-800 dark:bg-stone-950/40',
      ].join(' ')}
    >
      <header className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-2">
        <h2 className="flex items-baseline gap-2 text-[11px] font-semibold tracking-wider text-stone-500 uppercase dark:text-stone-400">
          {name}
          <span className="rounded-full bg-stone-200 px-1.5 text-[11px] tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            {count}
          </span>
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-stone-500 dark:text-stone-400">
          {formatMoney(total, currency)}
        </span>
      </header>

      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0">
        {isEmpty ? (
          <p className="m-2 rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs text-stone-400 dark:border-stone-800 dark:text-stone-600">
            <span className="hidden sm:inline">Перетащите сделку сюда</span>
            <span className="sm:hidden">Пока пусто</span>
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
