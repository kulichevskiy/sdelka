import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { LossReason } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { pluralize } from './admin-utils'

interface LossReasonsTabProps {
  lossReasons: LossReason[]
  onAddLossReason?: (name: string) => void
  onRenameLossReason?: (reasonId: string, name: string) => void
  onDeleteLossReason?: (reasonId: string) => void
}

export function LossReasonsTab({
  lossReasons,
  onAddLossReason,
  onRenameLossReason,
  onDeleteLossReason,
}: LossReasonsTabProps) {
  const [newReason, setNewReason] = useState('')
  const [pendingDelete, setPendingDelete] = useState<LossReason | null>(null)

  function submit() {
    if (!newReason.trim()) return
    onAddLossReason?.(newReason.trim())
    setNewReason('')
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Из этого списка менеджер выбирает причину, когда закрывает сделку как проигранную.
      </p>

      {lossReasons.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-400 dark:border-stone-800 dark:text-stone-600">
          Причин пока нет. Без них при закрытии сделки причина вводится текстом.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {lossReasons.map((reason) => (
            <li
              key={reason.id}
              className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-950"
            >
              <input
                value={reason.name}
                onChange={(event) => onRenameLossReason?.(reason.id, event.target.value)}
                aria-label="Причина проигрыша"
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-stone-900 hover:border-stone-200 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:text-stone-100 dark:hover:border-stone-800"
              />

              <span
                className={[
                  'shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums',
                  reason.usageCount > 0
                    ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                    : 'bg-stone-50 text-stone-400 dark:bg-stone-900 dark:text-stone-600',
                ].join(' ')}
              >
                {reason.usageCount > 0
                  ? `${reason.usageCount} ${pluralize(reason.usageCount, 'раз', 'раза', 'раз')}`
                  : 'не использовалась'}
              </span>

              <button
                type="button"
                onClick={() => setPendingDelete(reason)}
                aria-label={`Удалить причину ${reason.name}`}
                className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={newReason}
          onChange={(event) => setNewReason(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
          placeholder="Новая причина"
          aria-label="Новая причина проигрыша"
          className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <button
          type="button"
          onClick={submit}
          className="flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 dark:text-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-95"
        >
          <Plus className="size-4" aria-hidden="true" />
          Добавить
        </button>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Удалить причину?"
          subject={pendingDelete.name}
          warning={
            pendingDelete.usageCount > 0
              ? `Причину выбирали ${pendingDelete.usageCount} ${pluralize(pendingDelete.usageCount, 'раз', 'раза', 'раз')}. В уже закрытых сделках она останется.`
              : undefined
          }
          confirmLabel="Удалить"
          onConfirm={() => {
            onDeleteLossReason?.(pendingDelete.id)
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
