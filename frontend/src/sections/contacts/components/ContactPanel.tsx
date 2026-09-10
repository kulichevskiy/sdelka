import { roleLabel } from '@/lib/roles'
import { Building2, Mail, Phone, Plus, X } from 'lucide-react'
import { CustomFieldsSection } from '@/components/CustomFieldsSection'
import type {
  Activity,
  ActivityDraft,
  Company,
  Contact,
  ContactPatch,
  CustomField,
  RelatedDeal,
  User,
} from '../types'
import { ActivityFeed } from './ActivityFeed'
import { RelatedDeals } from './RelatedDeals'
import { Select } from './Select'
import { activitiesOfContact, dealsOfContact, initialsOf } from './contacts-utils'
import { useFadeIn, useSlideInFromRight } from './transitions'

interface ContactPanelProps {
  contact: Contact
  companies: Company[]
  users: User[]
  deals: RelatedDeal[]
  activities: Activity[]
  today: string
  customFields?: CustomField[]
  onClose: () => void
  onUpdateContact?: (contactId: string, patch: ContactPatch) => void
  onLogActivity?: (companyId: string, contactId: string | null, activity: ActivityDraft) => void
  onCreateDeal?: (companyId: string, contactId: string | null) => void
  onOpenDeal?: (dealId: string) => void
  onOpenCompany?: (companyId: string) => void
}

const labelClass =
  'text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500'

const fieldClass =
  'mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100'

export function ContactPanel({
  contact,
  companies,
  users,
  deals,
  activities,
  today,
  customFields = [],
  onClose,
  onUpdateContact,
  onLogActivity,
  onCreateDeal,
  onOpenDeal,
  onOpenCompany,
}: ContactPanelProps) {
  const backdropRef = useFadeIn()
  const panelRef = useSlideInFromRight()

  const company = companies.find((item) => item.id === contact.companyId)
  const contactDeals = dealsOfContact(deals, contact.id)
  const contactActivities = activitiesOfContact(activities, contact.id)

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
        aria-label={contact.name}
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-950"
      >
        <header className="flex items-start gap-3 border-b border-stone-200 p-4 dark:border-stone-800">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {initialsOf(contact.name)}
          </span>
          <div className="min-w-0 flex-1">
            <input
              value={contact.name}
              onChange={(event) => onUpdateContact?.(contact.id, { name: event.target.value })}
              aria-label="Имя контакта"
              className="-ml-1 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-lg font-semibold text-stone-900 hover:border-stone-200 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:text-stone-100 dark:hover:border-stone-800"
            />
            <button
              type="button"
              onClick={() => onOpenCompany?.(contact.companyId)}
              className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-400"
            >
              <Building2 className="size-3.5" aria-hidden="true" />
              {company?.name}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onCreateDeal?.(contact.companyId, contact.id)}
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
            <label className="col-span-2">
              <span className={labelClass}>Должность</span>
              <input
                value={contact.position}
                onChange={(event) => onUpdateContact?.(contact.id, { position: event.target.value })}
                className={fieldClass}
              />
            </label>

            <label className="col-span-1">
              <span className={labelClass}>Телефон</span>
              <input
                value={contact.phone}
                onChange={(event) => onUpdateContact?.(contact.id, { phone: event.target.value })}
                className={`${fieldClass} tabular-nums`}
              />
            </label>

            <label className="col-span-1">
              <span className={labelClass}>Почта</span>
              <input
                value={contact.email}
                onChange={(event) => onUpdateContact?.(contact.id, { email: event.target.value })}
                className={fieldClass}
              />
            </label>

            <div className="col-span-1">
              <span className={labelClass}>Компания</span>
              <Select
                value={contact.companyId}
                options={companies.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(companyId) => onUpdateContact?.(contact.id, { companyId })}
                ariaLabel="Компания"
                className="mt-1"
              />
            </div>

            <div className="col-span-1">
              <span className={labelClass}>Ответственный</span>
              <Select
                value={contact.ownerId}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.name,
                  hint: roleLabel(user.role),
                }))}
                onChange={(ownerId) => onUpdateContact?.(contact.id, { ownerId })}
                ariaLabel="Ответственный"
                className="mt-1"
              />
            </div>

            <div className="col-span-2 flex flex-wrap gap-3 pt-1 text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-stone-400" aria-hidden="true" />
                <span className="tabular-nums">{contact.phone}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-stone-400" aria-hidden="true" />
                {contact.email}
              </span>
            </div>
          </section>

          <CustomFieldsSection
            fields={customFields}
            values={contact.customValues ?? {}}
            onChange={(customValues) => onUpdateContact?.(contact.id, { customValues })}
          />

          <section className="border-b border-stone-200 p-4 dark:border-stone-800">
            <h3 className={labelClass}>Сделки</h3>
            <div className="mt-2">
              <RelatedDeals
                deals={contactDeals}
                emptyLabel="С этим человеком сделок пока нет"
                onOpenDeal={onOpenDeal}
              />
            </div>
          </section>

          <section className="p-4">
            <h3 className={labelClass}>Взаимодействия</h3>
            <div className="mt-2">
              <ActivityFeed
                activities={contactActivities}
                users={users}
                today={today}
                onLogActivity={(activity) =>
                  onLogActivity?.(contact.companyId, contact.id, activity)
                }
              />
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}
