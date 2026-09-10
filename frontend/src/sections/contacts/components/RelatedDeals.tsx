import { ArrowUpRight, Briefcase } from 'lucide-react'
import type { RelatedDeal } from '../types'
import { formatMoney } from './contacts-utils'

interface RelatedDealsProps {
  deals: RelatedDeal[]
  emptyLabel: string
  onOpenDeal?: (dealId: string) => void
}

export function RelatedDeals({ deals, emptyLabel, onOpenDeal }: RelatedDealsProps) {
  if (deals.length === 0) {
    return (
      <p className="flex items-center gap-2 py-2 text-xs text-stone-400 dark:text-stone-600">
        <Briefcase className="size-4" aria-hidden="true" />
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1">
      {deals.map((deal) => (
        <li key={deal.id}>
          <button
            type="button"
            onClick={() => onOpenDeal?.(deal.id)}
            className="group flex w-full items-center gap-2 rounded-lg border border-stone-200 p-2.5 text-left transition-colors hover:border-stone-300 hover:bg-stone-50 dark:border-stone-800 dark:hover:border-stone-700 dark:hover:bg-stone-900"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                <span className="truncate">{deal.title}</span>
                <ArrowUpRight
                  className="size-3.5 shrink-0 text-stone-400 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                />
              </span>
              <span
                className={[
                  'mt-0.5 inline-block rounded-full px-1.5 text-[11px]',
                  deal.isActive
                    ? 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                    : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
                ].join(' ')}
              >
                {deal.stageName}
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-stone-900 dark:text-stone-100">
              {formatMoney(deal.amount, deal.currency)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
