import { useState } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { Stage } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { dealsLabel } from './admin-utils'

interface PipelineTabProps {
  stages: Stage[]
  onReorderStage?: (stageId: string, newIndex: number) => void
  onRenameStage?: (stageId: string, name: string) => void
  onAddStage?: (name: string) => void
  onDeleteStage?: (stageId: string) => void
}

export function PipelineTab({
  stages,
  onReorderStage,
  onRenameStage,
  onAddStage,
  onDeleteStage,
}: PipelineTabProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [newStage, setNewStage] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Stage | null>(null)

  const ordered = [...stages].sort((a, b) => a.order - b.order)

  function submitNewStage() {
    if (!newStage.trim()) return
    onAddStage?.(newStage.trim())
    setNewStage('')
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Порядок стадий задаёт порядок колонок на доске сделок.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {ordered.map((stage, index) => (
          <li
            key={stage.id}
            onDragOver={(event) => {
              event.preventDefault()
              setDropIndex(index)
            }}
            onDrop={() => {
              if (draggedId) onReorderStage?.(draggedId, index)
              setDraggedId(null)
              setDropIndex(null)
            }}
            className={[
              'flex items-center gap-2 rounded-lg border bg-white p-2 transition-all duration-150 dark:bg-stone-950',
              draggedId === stage.id ? 'opacity-40' : '',
              dropIndex === index && draggedId && draggedId !== stage.id
                ? 'border-stone-400 dark:border-stone-700'
                : 'border-stone-200 dark:border-stone-800',
            ].join(' ')}
          >
            <span
              draggable
              onDragStart={() => setDraggedId(stage.id)}
              onDragEnd={() => {
                setDraggedId(null)
                setDropIndex(null)
              }}
              aria-label={`Переместить стадию ${stage.name}`}
              className="cursor-grab rounded-md p-1 text-stone-300 transition-colors hover:text-stone-500 active:cursor-grabbing dark:text-stone-700 dark:hover:text-stone-500"
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </span>

            <span className="w-5 shrink-0 text-center text-xs tabular-nums text-stone-400 dark:text-stone-600">
              {index + 1}
            </span>

            <input
              value={stage.name}
              onChange={(event) => onRenameStage?.(stage.id, event.target.value)}
              aria-label="Название стадии"
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-stone-900 hover:border-stone-200 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:text-stone-100 dark:hover:border-stone-800"
            />

            <span
              className={[
                'shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums',
                stage.dealCount > 0
                  ? 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                  : 'bg-stone-100 text-stone-400 dark:bg-stone-900 dark:text-stone-600',
              ].join(' ')}
            >
              {dealsLabel(stage.dealCount)}
            </span>

            <button
              type="button"
              onClick={() => setPendingDelete(stage)}
              aria-label={`Удалить стадию ${stage.name}`}
              className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          value={newStage}
          onChange={(event) => setNewStage(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submitNewStage()}
          placeholder="Название новой стадии"
          aria-label="Название новой стадии"
          className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <button
          type="button"
          onClick={submitNewStage}
          className="flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 dark:text-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-95"
        >
          <Plus className="size-4" aria-hidden="true" />
          Добавить стадию
        </button>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Удалить стадию?"
          subject={pendingDelete.name}
          warning={
            pendingDelete.dealCount > 0
              ? `На этой стадии сейчас ${dealsLabel(pendingDelete.dealCount)}. Их придётся перенести вручную.`
              : undefined
          }
          confirmLabel="Удалить"
          onConfirm={() => {
            onDeleteStage?.(pendingDelete.id)
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
