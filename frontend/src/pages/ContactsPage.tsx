import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import {
  useActivities,
  useCompanies,
  useContacts,
  useCreateActivity,
  useCreateCompany,
  useCreateContact,
  useCreateDeal,
  useCustomFields,
  useDeals,
  useStages,
  useUpdateCompany,
  useUpdateContact,
  useUsers,
} from '@/api/queries'
import { EmptyState } from '@/components/EmptyState'
import { BuildingsIllustration, PeopleIllustration } from '@/components/illustrations'
import { Alert, Button, Field } from '@/components/ui'
import { useSession } from '@/routes/AppLayout'
import { ContactsDirectory } from '@/sections/contacts/components/ContactsDirectory'
import { Select } from '@/sections/contacts/components/Select'
import type { ContactsTab, RelatedDeal, Activity as SectionActivity } from '@/sections/contacts/types'

type CreateKind = ContactsTab | null

export function ContactsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { me, today } = useSession()

  const contacts = useContacts()
  const companies = useCompanies()
  const deals = useDeals().data ?? []
  const stages = useStages().data ?? []
  const activities = useActivities().data ?? []
  const users = useUsers().data ?? []
  const customFields = useCustomFields().data ?? []

  const updateContact = useUpdateContact()
  const updateCompany = useUpdateCompany()
  const createActivity = useCreateActivity()
  const createDeal = useCreateDeal()

  // ?create=contact из чеклиста сразу открывает форму
  const [creating, setCreating] = useState<CreateKind>(
    searchParams.get('create') === 'contact' ? 'contacts' : searchParams.get('create') === 'company' ? 'companies' : null,
  )

  const stageById = new Map(stages.map((stage) => [stage.id, stage]))
  const contactList = contacts.data ?? []
  const companyList = companies.data ?? []

  const relatedDeals: RelatedDeal[] = deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    companyId: deal.companyId,
    contactId: deal.contactId ?? '',
    stageName: stageById.get(deal.stageId)?.name ?? '',
    amount: deal.amount,
    currency: me.org.currency,
    isActive: !stageById.get(deal.stageId)?.isClosing,
  }))

  const sectionActivities: SectionActivity[] = activities.map((activity) => ({
    id: activity.id,
    companyId: activity.companyId,
    contactId: activity.contactId,
    type: activity.type,
    authorId: activity.authorId,
    date: activity.date,
    note: activity.note,
  }))

  const loaded = contacts.isSuccess && companies.isSuccess

  return (
    <>
      <ContactsDirectory
        key={`${searchParams.get('contact') ?? ''}:${searchParams.get('company') ?? ''}`}
        contacts={contactList}
        companies={companyList}
        deals={relatedDeals}
        activities={sectionActivities}
        users={users.filter((user) => user.status !== 'disabled')}
        currentUserId={me.user.id}
        today={today}
        customFields={customFields}
        initialContactId={searchParams.get('contact')}
        initialCompanyId={searchParams.get('company')}
        emptyContacts={
          loaded ? (
            <EmptyState
              illustration={<PeopleIllustration />}
              title="Контактов ещё нет"
              description="Контакт — человек в компании клиента: с кем вы созваниваетесь, кому пишете. Каждая сделка привязана к контакту, чтобы история общения была в одном месте."
              action={<Button onClick={() => setCreating('contacts')}>Добавить контакт</Button>}
            />
          ) : null
        }
        emptyCompanies={
          loaded ? (
            <EmptyState
              illustration={<BuildingsIllustration />}
              title="Компаний ещё нет"
              description="Компания объединяет контакты и сделки одного клиента. Обычно она появляется вместе с первой сделкой, но можно завести и заранее."
              action={<Button onClick={() => setCreating('companies')}>Добавить компанию</Button>}
            />
          ) : null
        }
        onCreate={(tab) => setCreating(tab)}
        onUpdateContact={(id, patch) => updateContact.mutate({ id, patch })}
        onUpdateCompany={(id, patch) => updateCompany.mutate({ id, patch })}
        onLogActivity={(companyId, contactId, draft) => createActivity.mutate({ companyId, contactId, ...draft })}
        onCreateDeal={(companyId, contactId) => {
          createDeal.mutate(
            { title: 'Новая сделка', companyId, contactId },
            { onSuccess: (deal) => navigate(`/deals?deal=${deal.id}`) },
          )
        }}
        onOpenDeal={(dealId) => navigate(`/deals?deal=${dealId}`)}
      />

      {creating && (
        <CreateDialog
          kind={creating}
          companies={companyList}
          onClose={() => setCreating(null)}
          onCreated={() => setCreating(null)}
        />
      )}
    </>
  )
}

/** Создание контакта или компании: контактные данные спрашиваем сразу, иначе карточка остаётся пустой */
function CreateDialog({
  kind,
  companies,
  onClose,
  onCreated,
}: {
  kind: ContactsTab
  companies: Array<{ id: string; name: string }>
  onClose: () => void
  onCreated: () => void
}) {
  const createContact = useCreateContact()
  const createCompany = useCreateCompany()
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [industry, setIndustry] = useState('')
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? '__new__')
  const [newCompany, setNewCompany] = useState('')

  const isContact = kind === 'contacts'
  const needsNewCompany = isContact && companyId === '__new__'
  const canSubmit = name.trim() && (!needsNewCompany || newCompany.trim())
  const pending = createContact.isPending || createCompany.isPending
  const error = createContact.error ?? createCompany.error

  async function submit() {
    if (!canSubmit || pending) return
    if (!isContact) {
      await createCompany.mutateAsync({ name: name.trim(), industry: industry.trim(), phone: phone.trim() })
      return onCreated()
    }
    let targetCompanyId = companyId
    if (needsNewCompany) {
      const company = await createCompany.mutateAsync({ name: newCompany.trim() })
      targetCompanyId = company.id
    }
    await createContact.mutateAsync({
      name: name.trim(),
      companyId: targetCompanyId,
      position: position.trim(),
      email: email.trim(),
      phone: phone.trim(),
    })
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isContact ? 'Новый контакт' : 'Новая компания'}
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
        className="relative w-full max-w-sm rounded-xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-950"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Отмена"
          className="absolute top-3 right-3 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <h2 className="pr-6 text-base font-semibold text-stone-900 dark:text-stone-100">
          {isContact ? 'Новый контакт' : 'Новая компания'}
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          <Field
            label={isContact ? 'Имя' : 'Название'}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
            placeholder={isContact ? 'Игорь Панов' : 'ООО «Север»'}
          />
          {isContact && (
            <>
              <Field label="Должность" value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Коммерческий директор" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Почта" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="i.panov@sever.ru" />
                <Field label="Телефон" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} placeholder="+7 911 000-00-00" />
              </div>
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">Компания</span>
                <Select
                  value={companyId}
                  options={[
                    ...companies.map((company) => ({ value: company.id, label: company.name })),
                    { value: '__new__', label: 'Новая компания…' },
                  ]}
                  onChange={setCompanyId}
                  ariaLabel="Компания"
                  className="mt-1"
                />
              </div>
              {needsNewCompany && (
                <Field label="Название компании" value={newCompany} onChange={(event) => setNewCompany(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} />
              )}
            </>
          )}
          {!isContact && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Отрасль" value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Оптовая торговля" />
              <Field label="Телефон" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} placeholder="+7 495 000-00-00" />
            </div>
          )}
          {error && <Alert>{error.message}</Alert>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={!canSubmit} loading={pending}>
            Создать
          </Button>
        </div>
      </div>
    </div>
  )
}
