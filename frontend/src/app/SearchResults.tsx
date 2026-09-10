import { Building2, KanbanSquare, UserRound } from 'lucide-react'
import { useCompanies, useContacts, useDeals } from '@/api/queries'

interface SearchResultsProps {
  query: string
  onPick: (target: { kind: 'deal' | 'contact' | 'company'; id: string }) => void
  className?: string
}

/** Глобальный поиск по уже загруженным данным: сделки, контакты, компании */
export function SearchResults({ query, onPick, className = '' }: SearchResultsProps) {
  const deals = useDeals().data ?? []
  const contacts = useContacts().data ?? []
  const companies = useCompanies().data ?? []

  const needle = query.trim().toLowerCase()
  if (!needle) return null

  const companyById = new Map(companies.map((company) => [company.id, company]))

  const foundDeals = deals
    .filter(
      (deal) =>
        deal.title.toLowerCase().includes(needle) ||
        (companyById.get(deal.companyId)?.name ?? '').toLowerCase().includes(needle),
    )
    .slice(0, 5)
  const foundContacts = contacts
    .filter((contact) => contact.name.toLowerCase().includes(needle) || contact.position.toLowerCase().includes(needle))
    .slice(0, 5)
  const foundCompanies = companies.filter((company) => company.name.toLowerCase().includes(needle)).slice(0, 5)

  const isEmpty = !foundDeals.length && !foundContacts.length && !foundCompanies.length

  const groupClass = 'px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500'
  const rowClass =
    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'

  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      {isEmpty && <p className="px-2 py-3 text-sm text-stone-400 dark:text-stone-600">Ничего не найдено</p>}

      {foundDeals.length > 0 && (
        <>
          <p className={groupClass}>Сделки</p>
          {foundDeals.map((deal) => (
            <button key={deal.id} type="button" onClick={() => onPick({ kind: 'deal', id: deal.id })} className={rowClass}>
              <KanbanSquare className="size-4 shrink-0 text-stone-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{deal.title}</span>
                <span className="block truncate text-xs text-stone-400 dark:text-stone-500">
                  {companyById.get(deal.companyId)?.name}
                </span>
              </span>
            </button>
          ))}
        </>
      )}

      {foundContacts.length > 0 && (
        <>
          <p className={groupClass}>Контакты</p>
          {foundContacts.map((contact) => (
            <button key={contact.id} type="button" onClick={() => onPick({ kind: 'contact', id: contact.id })} className={rowClass}>
              <UserRound className="size-4 shrink-0 text-stone-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{contact.name}</span>
                <span className="block truncate text-xs text-stone-400 dark:text-stone-500">{contact.position}</span>
              </span>
            </button>
          ))}
        </>
      )}

      {foundCompanies.length > 0 && (
        <>
          <p className={groupClass}>Компании</p>
          {foundCompanies.map((company) => (
            <button key={company.id} type="button" onClick={() => onPick({ kind: 'company', id: company.id })} className={rowClass}>
              <Building2 className="size-4 shrink-0 text-stone-400" aria-hidden="true" />
              <span className="truncate">{company.name}</span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
