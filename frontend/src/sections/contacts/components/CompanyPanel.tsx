import { roleLabel } from '@/lib/roles'
import { Globe, Phone, Plus, UserRound, X } from 'lucide-react'
import { CustomFieldsSection } from '@/components/CustomFieldsSection'
import type {
  Activity,
  ActivityDraft,
  Company,
  CompanyPatch,
  Contact,
  CustomField,
  RelatedDeal,
  User,
} from '../types'
import { ActivityFeed } from './ActivityFeed'
import { RelatedDeals } from './RelatedDeals'
import { Select } from './Select'
import {
  activitiesOfCompany,
  contactsOfCompany,
  dealsOfCompany,
  initialsOf,
} from './contacts-utils'
import { useFadeIn, useSlideInFromRight } from './transitions'

interface CompanyPanelProps {
  company: Company
  contacts: Contact[]
  users: User[]
  deals: RelatedDeal[]
  activities: Activity[]
  today: string
  customFields?: CustomField[]
  onClose: () => void
  onUpdateCompany?: (companyId: string, patch: CompanyPatch) => void
  onLogActivity?: (companyId: string, contactId: string | null, activity: ActivityDraft) => void
  onCreateDeal?: (companyId: string, contactId: string | null) => void
  onOpenDeal?: (dealId: string) => void
  onOpenContact?: (contactId: string) => void
}

const labelClass =
  'text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500'

const fieldClass =
  'mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100'

export function CompanyPanel({
  company,
  contacts,
  users,
  deals,
  activities,
  today,
  customFields = [],
  onClose,
  onUpdateCompany,
  onLogActivity,
  onCreateDeal,
  onOpenDeal,
  onOpenContact,
}: CompanyPanelProps) {
  const backdropRef = useFadeIn()
  const panelRef = useSlideInFromRight()

  const people = contactsOfCompany(contacts, company.id)
  const companyDeals = dealsOfCompany(deals, company.id)
  const companyActivities = activitiesOfCompany(activities, company.id)

  return (
    <div className="fixed inset-0 z-40" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-stone-900/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={company.name}
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-950"
      >
        <header className="flex items-start gap-3 border-b border-stone-200 p-4 dark:border-stone-800">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold tracking-wider text-stone-900 uppercase dark:text-stone-200">
              {company.industry}
            </span>
            <input
              value={company.name}
              onChange={(event) => onUpdateCompany?.(company.id, { name: event.target.value })}
              aria-label="Название компании"
              className="-ml-1 mt-0.5 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-lg font-semibold text-stone-900 hover:border-stone-200 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:text-stone-100 dark:hover:border-stone-800"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onCreateDeal?.(company.id, null)}
              className="flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 dark:text-stone-900 px-2.5 py-1.5 text-xs font-medium text-white transition-all duration-150 hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-95"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Сделка
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть панель"
              className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <section className="grid grid-cols-2 gap-3 border-b border-stone-200 p-4 dark:border-stone-800">
            <label className="col-span-1">
              <span className={labelClass}>Сайт</span>
              <input
                value={company.website}
                onChange={(event) => onUpdateCompany?.(company.id, { website: event.target.value })}
                className={fieldClass}
              />
            </label>

            <label className="col-span-1">
              <span className={labelClass}>Телефон</span>
              <input
                value={company.phone}
                onChange={(event) => onUpdateCompany?.(company.id, { phone: event.target.value })}
                className={`${fieldClass} tabular-nums`}
              />
            </label>

            <label className="col-span-1">
              <span className={labelClass}>Отрасль</span>
              <input
                value={company.industry}
                onChange={(event) => onUpdateCompany?.(company.id, { industry: event.target.value })}
                className={fieldClass}
              />
            </label>

            <div className="col-span-1">
              <span className={labelClass}>Ответственный</span>
              <Select
                value={company.ownerId}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.name,
                  hint: roleLabel(user.role),
                }))}
                onChange={(ownerId) => onUpdateCompany?.(company.id, { ownerId })}
                ariaLabel="Ответственный"
                className="mt-1"
              />
            </div>

            <label className="col-span-2">
              <span className={labelClass}>Заметка о компании</span>
              <textarea
                value={company.note}
                rows={3}
                onChange={(event) => onUpdateCompany?.(company.id, { note: event.target.value })}
                className={`${fieldClass} resize-y leading-relaxed`}
              />
            </label>

            <div className="col-span-2 flex flex-wrap gap-3 text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5">
                <Globe className="size-3.5 text-stone-400" aria-hidden="true" />
                {company.website}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-stone-400" aria-hidden="true" />
                <span className="tabular-nums">{company.phone}</span>
              </span>
            </div>
          </section>

          <CustomFieldsSection
            fields={customFields}
            values={company.customValues ?? {}}
            onChange={(customValues) => onUpdateCompany?.(company.id, { customValues })}
          />

          <section className="border-b border-stone-200 p-4 dark:border-stone-800">
            <h3 className={labelClass}>Люди компании</h3>
            {people.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1">
                {people.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => onOpenContact?.(person.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-900"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                        {initialsOf(person.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                          {person.name}
                        </span>
                        <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                          {person.position}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 flex items-center gap-2 py-2 text-xs text-stone-400 dark:text-stone-600">
                <UserRound className="size-4" aria-hidden="true" />
                Контактных лиц пока нет
              </p>
            )}
          </section>

          <section className="border-b border-stone-200 p-4 dark:border-stone-800">
            <h3 className={labelClass}>Сделки</h3>
            <div className="mt-2">
              <RelatedDeals
                deals={companyDeals}
                emptyLabel="С этой компанией сделок пока нет"
                onOpenDeal={onOpenDeal}
              />
            </div>
          </section>

          <section className="p-4">
            <h3 className={labelClass}>Взаимодействия</h3>
            <div className="mt-2">
              <ActivityFeed
                activities={companyActivities}
                users={users}
                today={today}
                contactNameOf={(contactId) =>
                  contacts.find((person) => person.id === contactId)?.name
                }
                onLogActivity={(activity) => onLogActivity?.(company.id, null, activity)}
              />
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}
