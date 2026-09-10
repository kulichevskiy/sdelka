import { AlarmClock } from 'lucide-react'
import { STALE_DAYS, agoLabel, daysBetween, formatDate, formatMoney, initialsOf } from './contacts-utils'

interface DirectoryRowProps {
  title: string
  subtitle: string
  activeCount: number
  activeAmount: number
  currency: string
  /** ISO-дата последнего взаимодействия или null, если общения не было */
  lastContact: string | null
  ownerName?: string
  today: string
  onOpen?: () => void
}

export function DirectoryRow({
  title,
  subtitle,
  activeCount,
  activeAmount,
  currency,
  lastContact,
  ownerName,
  today,
  onOpen,
}: DirectoryRowProps) {
  const daysSince = lastContact ? daysBetween(lastContact, today) : null
  const isStale = daysSince !== null && daysSince > STALE_DAYS

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 text-left transition-all duration-150 hover:-transtone-y-px hover:border-stone-300 hover:shadow-xs sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] dark:border-stone-800 dark:bg-stone-950 dark:hover:border-stone-700"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500 dark:text-stone-400">
            {subtitle}
          </span>
        </span>

        <span className="hidden min-w-0 sm:block">
          {activeCount > 0 ? (
            <>
              <span className="block font-mono text-sm tabular-nums text-stone-900 dark:text-stone-100">
                {formatMoney(activeAmount, currency)}
              </span>
              <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">
                {activeCount} в работе
              </span>
            </>
          ) : (
            <span className="block text-xs text-stone-300 dark:text-stone-700">Нет активных сделок</span>
          )}
        </span>

        <span className="hidden min-w-0 sm:block">
          {lastContact ? (
            <>
              <span
                className={[
                  'flex items-center gap-1 text-sm tabular-nums',
                  isStale
                    ? 'font-medium text-amber-700 dark:text-amber-500'
                    : 'text-stone-600 dark:text-stone-400',
                ].join(' ')}
              >
                {isStale && <AlarmClock className="size-3.5 shrink-0" aria-hidden="true" />}
                {formatDate(lastContact, today)}
              </span>
              <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">
                {daysSince === 0 ? 'сегодня' : `${agoLabel(daysSince ?? 0)} назад`}
              </span>
            </>
          ) : (
            <span className="block text-xs text-stone-300 dark:text-stone-700">Не общались</span>
          )}
        </span>

        {ownerName && (
          <span
            title={ownerName}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300"
          >
            {initialsOf(ownerName)}
          </span>
        )}
      </button>
    </li>
  )
}
