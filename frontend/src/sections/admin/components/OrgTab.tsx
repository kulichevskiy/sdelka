import { useEffect, useState } from 'react'
import { Database, Trash2 } from 'lucide-react'
import type { Currency, OrgSettings } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { Select } from './Select'

interface OrgTabProps {
  org: OrgSettings
  isOwner: boolean
  onUpdateOrg?: (patch: { name?: string; currency?: Currency }) => void
  onLoadDemo?: () => void
  onClearDemo?: () => void
  isDemoPending?: boolean
}

const currencyOptions = [
  { value: 'RUB', label: '₽ Рубли' },
  { value: 'USD', label: '$ Доллары' },
  { value: 'EUR', label: '€ Евро' },
]

const labelClass = 'text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500'

export function OrgTab({ org, onUpdateOrg, onLoadDemo, onClearDemo, isDemoPending }: OrgTabProps) {
  const [name, setName] = useState(org.name)
  const [pendingClear, setPendingClear] = useState(false)

  // Имя редактируется локально и сохраняется по blur/Enter — иначе PATCH на каждую букву
  useEffect(() => setName(org.name), [org.name])

  function commitName() {
    const next = name.trim()
    if (next && next !== org.name) onUpdateOrg?.({ name: next })
    else setName(org.name)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <section className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Основное</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Название организации</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
          </label>
          <div>
            <span className={labelClass}>Валюта сделок</span>
            <Select
              value={org.currency}
              options={currencyOptions}
              onChange={(value) => onUpdateOrg?.({ currency: value as Currency })}
              ariaLabel="Валюта"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              Одна на всю организацию: суммы в колонках складываются без пересчёта курсов.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
          <Database className="size-4 text-stone-400" aria-hidden="true" />
          Демо-данные
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Набор компаний, контактов, сделок и задач, чтобы посмотреть систему в работе. Даты подстраиваются под
          сегодняшний день. Коллеги из демо появятся как приглашённые пользователи.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {org.hasDemoData ? (
            <button
              type="button"
              disabled={isDemoPending}
              onClick={() => setPendingClear(true)}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-stone-800 dark:text-stone-400 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Удалить демо-данные
            </button>
          ) : (
            <button
              type="button"
              disabled={isDemoPending}
              onClick={onLoadDemo}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
            >
              {isDemoPending ? 'Заполняем…' : 'Заполнить демо-данными'}
            </button>
          )}
        </div>
      </section>

      {pendingClear && (
        <ConfirmDialog
          title="Удалить демо-данные?"
          subject="Все демо-компании, контакты, сделки, задачи и приглашённые демо-коллеги"
          warning="Ваши собственные записи останутся. Стадии, поля и причины проигрыша тоже не трогаем."
          confirmLabel="Удалить"
          onConfirm={() => {
            onClearDemo?.()
            setPendingClear(false)
          }}
          onCancel={() => setPendingClear(false)}
        />
      )}
    </div>
  )
}
