import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { ContactsProps, ContactsTab } from '../types'
import { CompanyPanel } from './CompanyPanel'
import { ContactPanel } from './ContactPanel'
import { DirectoryRow } from './DirectoryRow'
import {
  activitiesOfCompany,
  activitiesOfContact,
  companyById,
  contactsOfCompany,
  dealsOfCompany,
  dealsOfContact,
  lastContactDate,
  pluralize,
  summarize,
  userById,
} from './contacts-utils'

/** Типографика продукта: Graphik (product/design-system/typography.json), задаётся оболочкой */
export function ContactsDirectory({
  contacts,
  companies,
  deals,
  activities,
  users,
  today,
  customFields = [],
  initialContactId = null,
  initialCompanyId = null,
  initialTab,
  emptyContacts,
  emptyCompanies,
  onOpenContact,
  onOpenCompany,
  onCreate,
  onUpdateContact,
  onUpdateCompany,
  onLogActivity,
  onCreateDeal,
  onOpenDeal,
}: ContactsProps) {
  const [tab, setTab] = useState<ContactsTab>(initialTab ?? (initialCompanyId ? 'companies' : 'contacts'))
  const [openContactId, setOpenContactId] = useState<string | null>(initialContactId)
  const [openCompanyId, setOpenCompanyId] = useState<string | null>(initialCompanyId)

  const contactRows = useMemo(
    () =>
      contacts.map((contact) => {
        const contactActivities = activitiesOfContact(activities, contact.id)
        return {
          id: contact.id,
          title: contact.name,
          subtitle: [contact.position, companyById(companies, contact.companyId)?.name]
            .filter(Boolean)
            .join(' · '),
          summary: summarize(dealsOfContact(deals, contact.id)),
          lastContact: lastContactDate(contactActivities),
          ownerName: userById(users, contact.ownerId)?.name,
        }
      }),
    [contacts, companies, deals, activities, users],
  )

  const companyRows = useMemo(
    () =>
      companies.map((company) => {
        const companyActivities = activitiesOfCompany(activities, company.id)
        const people = contactsOfCompany(contacts, company.id)
        return {
          id: company.id,
          title: company.name,
          subtitle: [
            company.industry,
            `${people.length} ${pluralize(people.length, 'человек', 'человека', 'человек')}`,
          ].join(' · '),
          summary: summarize(dealsOfCompany(deals, company.id)),
          lastContact: lastContactDate(companyActivities),
          ownerName: userById(users, company.ownerId)?.name,
        }
      }),
    [companies, contacts, deals, activities, users],
  )

  const rows = tab === 'contacts' ? contactRows : companyRows
  const openContact = contacts.find((contact) => contact.id === openContactId)
  const openCompany = companies.find((company) => company.id === openCompanyId)

  function showContact(contactId: string) {
    setOpenCompanyId(null)
    setOpenContactId(contactId)
    onOpenContact?.(contactId)
  }

  function showCompany(companyId: string) {
    setOpenContactId(null)
    setOpenCompanyId(companyId)
    onOpenCompany?.(companyId)
  }

  const tabs: Array<{ value: ContactsTab; label: string; count: number }> = [
    { value: 'contacts', label: 'Контакты', count: contacts.length },
    { value: 'companies', label: 'Компании', count: companies.length },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-stone-200 px-4 py-4 sm:px-6 dark:border-stone-800">
        <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Контакты
        </h1>

        <div className="flex rounded-lg border border-stone-200 p-0.5 dark:border-stone-800">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              aria-pressed={tab === item.value}
              className={[
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors',
                tab === item.value
                  ? 'bg-brand-600 font-medium text-white dark:bg-brand-500 dark:text-white'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100',
              ].join(' ')}
            >
              {item.label}
              <span
                className={[
                  'text-xs tabular-nums',
                  tab === item.value ? 'opacity-70' : 'text-stone-400 dark:text-stone-600',
                ].join(' ')}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onCreate?.(tab)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-600 dark:bg-brand-500 dark:text-white px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 dark:hover:bg-brand-400 active:scale-95"
        >
          <Plus className="size-4" aria-hidden="true" />
          {tab === 'contacts' ? 'Новый контакт' : 'Новая компания'}
        </button>
      </header>

      {rows.length === 0 && (tab === 'contacts' ? emptyContacts : emptyCompanies) ? (
        <div className="flex min-h-0 flex-1 flex-col">{tab === 'contacts' ? emptyContacts : emptyCompanies}</div>
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <DirectoryRow
              key={row.id}
              title={row.title}
              subtitle={row.subtitle}
              activeCount={row.summary.activeCount}
              activeAmount={row.summary.activeAmount}
              currency={row.summary.currency}
              lastContact={row.lastContact}
              ownerName={row.ownerName}
              today={today}
              onOpen={() => (tab === 'contacts' ? showContact(row.id) : showCompany(row.id))}
            />
          ))}
        </ul>
      </div>
      )}

      {openContact && (
        <ContactPanel
          contact={openContact}
          companies={companies}
          users={users}
          deals={deals}
          activities={activities}
          today={today}
          customFields={customFields.filter((field) => field.entity === 'contact')}
          onClose={() => setOpenContactId(null)}
          onUpdateContact={onUpdateContact}
          onLogActivity={onLogActivity}
          onCreateDeal={onCreateDeal}
          onOpenDeal={onOpenDeal}
          onOpenCompany={showCompany}
        />
      )}

      {openCompany && (
        <CompanyPanel
          company={openCompany}
          contacts={contacts}
          users={users}
          deals={deals}
          activities={activities}
          today={today}
          customFields={customFields.filter((field) => field.entity === 'company')}
          onClose={() => setOpenCompanyId(null)}
          onUpdateCompany={onUpdateCompany}
          onLogActivity={onLogActivity}
          onCreateDeal={onCreateDeal}
          onOpenDeal={onOpenDeal}
          onOpenContact={showContact}
        />
      )}
    </div>
  )
}
