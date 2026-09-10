import { ArrowDown, ArrowUp } from 'lucide-react'
import type { Company, Deal, Stage, Task, User } from '../types'
import { attentionOf, formatDate, formatMoney, initialsOf, nextTaskOf } from './deals-utils'

export type SortField = 'amount' | 'expectedCloseDate'
export type SortDirection = 'asc' | 'desc'

interface DealsTableProps {
  deals: Deal[]
  stages: Stage[]
  companies: Company[]
  users: User[]
  tasks: Task[]
  today: string
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
  onOpenDeal?: (dealId: string) => void
}

const headerClass =
  'px-3 py-2 text-left text-[11px] font-semibold tracking-wider text-stone-500 uppercase dark:text-stone-400'

export function DealsTable({
  deals,
  stages,
  companies,
  users,
  tasks,
  today,
  sortField,
  sortDirection,
  onSort,
  onOpenDeal,
}: DealsTableProps) {
  const SortIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown

  function sortButton(field: SortField, label: string) {
    return (
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 transition-colors hover:text-stone-900 dark:hover:text-stone-100"
      >
        {label}
        {sortField === field && <SortIcon className="size-3" aria-hidden="true" />}
      </button>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <table className="w-full min-w-4xl border-collapse">
        <thead className="border-b border-stone-200 dark:border-stone-800">
          <tr>
            <th className={headerClass}>Сделка</th>
            <th className={headerClass}>Компания</th>
            <th className={headerClass}>Стадия</th>
            <th className={`${headerClass} text-right`}>
              <span className="flex justify-end">{sortButton('amount', 'Сумма')}</span>
            </th>
            <th className={headerClass}>Ответственный</th>
            <th className={headerClass}>Следующий шаг</th>
            <th className={headerClass}>{sortButton('expectedCloseDate', 'Закрытие')}</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => {
            const stage = stages.find((item) => item.id === deal.stageId)
            const company = companies.find((item) => item.id === deal.companyId)
            const owner = users.find((item) => item.id === deal.ownerId)
            const next = nextTaskOf(deal.id, tasks)
            const attention = attentionOf(deal, tasks, today, stage?.isClosing ?? false)

            return (
              <tr
                key={deal.id}
                onClick={() => onOpenDeal?.(deal.id)}
                className="cursor-pointer border-b border-stone-100 transition-colors last:border-0 hover:bg-stone-50 dark:border-stone-900 dark:hover:bg-stone-900"
              >
                <td className="px-3 py-2.5 text-sm font-medium text-stone-900 dark:text-stone-100">
                  {deal.title}
                </td>
                <td className="px-3 py-2.5 text-sm text-stone-600 dark:text-stone-400">
                  {company?.name}
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    {stage?.name}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums text-stone-900 dark:text-stone-100">
                  {formatMoney(deal.amount, deal.currency)}
                </td>
                <td className="px-3 py-2.5">
                  {owner && (
                    <span className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                        {initialsOf(owner.name)}
                      </span>
                      {owner.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm">
                  {attention === 'no-next-step' ? (
                    <span className="text-amber-700 dark:text-amber-500">Нет следующего шага</span>
                  ) : next ? (
                    <span
                      className={
                        attention === 'overdue'
                          ? 'font-medium text-red-600 dark:text-red-400'
                          : 'text-stone-600 dark:text-stone-400'
                      }
                    >
                      {next.title}
                      <span className="ml-1.5 tabular-nums opacity-70">
                        {formatDate(next.dueDate)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-stone-400 dark:text-stone-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm tabular-nums text-stone-600 dark:text-stone-400">
                  {formatDate(deal.expectedCloseDate)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
