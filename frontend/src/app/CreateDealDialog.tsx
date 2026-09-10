import { useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/sections/deals/components/Select'
import { useCompanies, useContacts, useCreateCompany, useCreateDeal } from '@/api/queries'
import { Alert } from '@/components/ui'

interface CreateDealDialogProps {
  onClose: () => void
  onCreated: (dealId: string) => void
}

const fieldClass =
  'mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100'
const labelClass = 'text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500'

const NEW_COMPANY = '__new__'

/**
 * Быстрое создание сделки. Если компаний ещё нет (первая сделка в организации),
 * компания создаётся прямо здесь — иначе онбординг упирается в пустой список.
 */
export function CreateDealDialog({ onClose, onCreated }: CreateDealDialogProps) {
  const companies = useCompanies().data ?? []
  const contacts = useContacts().data ?? []
  const createDeal = useCreateDeal()
  const createCompany = useCreateCompany()

  const [title, setTitle] = useState('')
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? NEW_COMPANY)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [contactId, setContactId] = useState(
    contacts.find((contact) => contact.companyId === (companies[0]?.id ?? ''))?.id ?? '',
  )
  const [amount, setAmount] = useState('')

  const companyContacts = contacts.filter((contact) => contact.companyId === companyId)
  const isNewCompany = companyId === NEW_COMPANY
  const canSubmit = title.trim() && (isNewCompany ? newCompanyName.trim() : companyId)
  const isPending = createDeal.isPending || createCompany.isPending
  const error = createDeal.error ?? createCompany.error

  async function submit() {
    if (!canSubmit || isPending) return
    let targetCompanyId = companyId
    if (isNewCompany) {
      const company = await createCompany.mutateAsync({ name: newCompanyName.trim() })
      targetCompanyId = company.id
    }
    const deal = await createDeal.mutateAsync({
      title: title.trim(),
      companyId: targetCompanyId,
      contactId: isNewCompany ? null : contactId || null,
      amount: Number(amount) || 0,
    })
    onCreated(deal.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Новая сделка"
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

        <h2 className="pr-6 text-base font-semibold text-stone-900 dark:text-stone-100">Новая сделка</h2>

        <label className="mt-4 block">
          <span className={labelClass}>Название</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
            placeholder="Например: внедрение на 10 мест"
            className={fieldClass}
          />
        </label>

        <div className="mt-3">
          <span className={labelClass}>Компания</span>
          <Select
            value={companyId}
            options={[
              ...companies.map((company) => ({ value: company.id, label: company.name })),
              { value: NEW_COMPANY, label: 'Новая компания…', hint: 'Создать вместе со сделкой' },
            ]}
            onChange={(value) => {
              setCompanyId(value)
              setContactId(contacts.find((contact) => contact.companyId === value)?.id ?? '')
            }}
            ariaLabel="Компания"
            className="mt-1"
          />
        </div>

        {isNewCompany ? (
          <label className="mt-3 block">
            <span className={labelClass}>Название компании</span>
            <input
              value={newCompanyName}
              onChange={(event) => setNewCompanyName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submit()}
              placeholder="ООО «Север»"
              className={fieldClass}
            />
          </label>
        ) : (
          <div className="mt-3">
            <span className={labelClass}>Контакт</span>
            <Select
              value={contactId}
              options={companyContacts.map((contact) => ({ value: contact.id, label: contact.name, hint: contact.position }))}
              onChange={setContactId}
              ariaLabel="Контакт"
              placeholder="Нет контактов в компании"
              className="mt-1"
            />
          </div>
        )}

        <label className="mt-3 block">
          <span className={labelClass}>Сумма</span>
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
            placeholder="0"
            className={`${fieldClass} font-mono tabular-nums`}
          />
        </label>

        {error && (
          <div className="mt-3">
            <Alert>{error.message}</Alert>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!canSubmit || isPending}
            onClick={submit}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-stone-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            {isPending ? 'Создаём…' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}
