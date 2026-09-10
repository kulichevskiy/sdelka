import { AlertCircle } from 'lucide-react'
import type { CustomField, CustomValues } from '@/api/types'
import { Select } from '@/sections/deals/components/Select'

/** Секциям хватает полей без порядка: они уже приходят отсортированными */
type FieldLike = Omit<CustomField, 'order'>

interface CustomFieldsSectionProps {
  fields: FieldLike[]
  values: CustomValues
  onChange: (values: CustomValues) => void
  /** Дата «сегодня» нужна только для подсказки в поле-дате; не обязательна */
  className?: string
}

const labelClass = 'text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500'
const fieldClass =
  'mt-1 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm text-stone-900 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:bg-stone-900 dark:text-stone-100'

function isEmpty(value: string | number | null | undefined) {
  return value === null || value === undefined || value === ''
}

/**
 * Секция «Дополнительно» в панелях сделки, контакта и компании.
 * Обязательные незаполненные поля подсвечены — бэкенд их не валидирует,
 * подсветка и есть напоминание.
 */
export function CustomFieldsSection({ fields, values, onChange, className = '' }: CustomFieldsSectionProps) {
  if (fields.length === 0) return null

  const set = (fieldId: string, value: string | number | null) => onChange({ ...values, [fieldId]: value })

  return (
    <section className={`grid grid-cols-2 gap-3 border-b border-stone-200 p-4 dark:border-stone-800 ${className}`}>
      <h3 className={`col-span-2 ${labelClass}`}>Дополнительно</h3>
      {fields.map((field) => {
        const value = values[field.id]
        const missing = field.isRequired && isEmpty(value)
        const border = missing
          ? 'border-amber-400 dark:border-amber-700'
          : 'border-stone-200 dark:border-stone-800'
        const label = (
          <span className={`${labelClass} flex items-center gap-1`}>
            {field.name}
            {field.isRequired && (
              <span className={missing ? 'text-amber-600 dark:text-amber-500' : ''} title="Обязательное поле">
                *
              </span>
            )}
            {missing && <AlertCircle className="size-3 text-amber-600 dark:text-amber-500" aria-label="Не заполнено" />}
          </span>
        )
        const wide = field.type === 'text' || field.type === 'select'

        if (field.type === 'select') {
          return (
            <div key={field.id} className="col-span-2">
              {label}
              <Select
                value={typeof value === 'string' ? value : ''}
                options={field.options.map((option) => ({ value: option, label: option }))}
                onChange={(next) => set(field.id, next)}
                ariaLabel={field.name}
                placeholder="Не выбрано"
                className={`mt-1 ${missing ? '[&>button]:border-amber-400' : ''}`}
              />
            </div>
          )
        }

        return (
          <label key={field.id} className={wide ? 'col-span-2' : 'col-span-1'}>
            {label}
            <input
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={value ?? ''}
              onChange={(event) => {
                const raw = event.target.value
                if (raw === '') return set(field.id, null)
                set(field.id, field.type === 'number' ? Number(raw) : raw)
              }}
              className={`${fieldClass} ${border} ${field.type === 'number' ? 'font-mono tabular-nums' : ''}`}
            />
          </label>
        )
      })}
    </section>
  )
}
