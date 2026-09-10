import { useState } from 'react'
import { ListPlus, Plus, Trash2, X } from 'lucide-react'
import type {
  CustomField,
  CustomFieldDraft,
  FieldEntity,
  FieldType,
} from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { Select } from './Select'
import { entityLabels, typeLabels } from './admin-utils'

interface FieldsTabProps {
  customFields: CustomField[]
  onAddField?: (field: CustomFieldDraft) => void
  onToggleFieldRequired?: (fieldId: string, isRequired: boolean) => void
  onDeleteField?: (fieldId: string) => void
  onAddFieldOption?: (fieldId: string, option: string) => void
  onRemoveFieldOption?: (fieldId: string, option: string) => void
}

const entityOptions = (Object.keys(entityLabels) as FieldEntity[]).map((value) => ({
  value,
  label: entityLabels[value],
}))

const typeOptions = (Object.keys(typeLabels) as FieldType[]).map((value) => ({
  value,
  label: typeLabels[value],
}))

/**
 * Без вторичного цвета сущности разводятся формой, а не оттенком:
 * заливка, светлая заливка и обводка различимы и в монохроме, и в ч/б печати.
 */
const entityBadgeClasses: Record<FieldEntity, string> = {
  deal: 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900',
  contact: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  company: 'border border-stone-300 text-stone-500 dark:border-stone-700 dark:text-stone-400',
}

export function FieldsTab({
  customFields,
  onAddField,
  onToggleFieldRequired,
  onDeleteField,
  onAddFieldOption,
  onRemoveFieldOption,
}: FieldsTabProps) {
  const [name, setName] = useState('')
  const [entity, setEntity] = useState<FieldEntity>('deal')
  const [type, setType] = useState<FieldType>('text')
  const [isRequired, setIsRequired] = useState(false)
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({})
  const [pendingDelete, setPendingDelete] = useState<CustomField | null>(null)

  function submitField() {
    if (!name.trim()) return
    onAddField?.({ name: name.trim(), entity, type, isRequired })
    setName('')
    setIsRequired(false)
  }

  function submitOption(field: CustomField) {
    const draft = optionDrafts[field.id]?.trim()
    if (!draft) return
    onAddFieldOption?.(field.id, draft)
    setOptionDrafts((current) => ({ ...current, [field.id]: '' }))
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
        <label className="min-w-40 flex-1">
          <span className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">
            Название поля
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submitField()}
            placeholder="Например: источник заявки"
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>

        <div className="w-36">
          <span className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">
            Сущность
          </span>
          <Select
            value={entity}
            options={entityOptions}
            onChange={(value) => setEntity(value as FieldEntity)}
            ariaLabel="Сущность поля"
            className="mt-1"
          />
        </div>

        <div className="w-32">
          <span className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">
            Тип
          </span>
          <Select
            value={type}
            options={typeOptions}
            onChange={(value) => setType(value as FieldType)}
            ariaLabel="Тип поля"
            className="mt-1"
          />
        </div>

        <label className="flex items-center gap-2 py-2 text-sm text-stone-600 dark:text-stone-400">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(event) => setIsRequired(event.target.checked)}
            className="size-4 accent-brand-600"
          />
          Обязательное
        </label>

        <button
          type="button"
          onClick={submitField}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 dark:bg-brand-500 dark:text-white px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 dark:hover:bg-brand-400 active:scale-95"
        >
          <Plus className="size-4" aria-hidden="true" />
          Добавить
        </button>
      </div>

      {customFields.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-400 dark:border-stone-800 dark:text-stone-600">
          Дополнительных полей пока нет. Продукт работает и без них — добавляйте только то,
          что команда действительно заполняет.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {customFields.map((field) => (
            <li
              key={field.id}
              className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-40 flex-1 text-sm font-medium text-stone-900 dark:text-stone-100">
                  {field.name}
                </span>

                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${entityBadgeClasses[field.entity]}`}
                >
                  {entityLabels[field.entity]}
                </span>

                <span className="w-16 shrink-0 text-xs text-stone-500 dark:text-stone-400">
                  {typeLabels[field.type]}
                </span>

                <label className="flex shrink-0 items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                  <input
                    type="checkbox"
                    checked={field.isRequired}
                    onChange={(event) => onToggleFieldRequired?.(field.id, event.target.checked)}
                    className="size-4 accent-brand-600"
                  />
                  Обязательное
                </label>

                <button
                  type="button"
                  onClick={() => setPendingDelete(field)}
                  aria-label={`Удалить поле ${field.name}`}
                  className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>

              {field.type === 'select' && (
                <div className="mt-2 border-t border-stone-100 pt-2 dark:border-stone-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {field.options.map((option) => (
                      <span
                        key={option}
                        className="flex items-center gap-1 rounded-full bg-stone-100 py-0.5 pr-1 pl-2 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                      >
                        {option}
                        <button
                          type="button"
                          onClick={() => onRemoveFieldOption?.(field.id, option)}
                          aria-label={`Удалить вариант ${option}`}
                          className="rounded-full p-0.5 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-700"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}

                    {field.options.length === 0 && (
                      <span className="text-xs text-stone-400 dark:text-stone-600">
                        Вариантов пока нет
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <input
                      value={optionDrafts[field.id] ?? ''}
                      onChange={(event) =>
                        setOptionDrafts((current) => ({
                          ...current,
                          [field.id]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => event.key === 'Enter' && submitOption(field)}
                      placeholder="Новый вариант"
                      aria-label={`Новый вариант для поля ${field.name}`}
                      className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                    />
                    <button
                      type="button"
                      onClick={() => submitOption(field)}
                      className="flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <ListPlus className="size-3.5" aria-hidden="true" />
                      Добавить
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Удалить поле?"
          subject={`${pendingDelete.name} · ${entityLabels[pendingDelete.entity]}`}
          warning="Значения этого поля во всех записях будут потеряны."
          confirmLabel="Удалить"
          onConfirm={() => {
            onDeleteField?.(pendingDelete.id)
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
