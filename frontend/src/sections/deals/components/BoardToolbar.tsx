import { roleLabel } from '@/lib/roles'
import { AlertTriangle, KanbanSquare, Plus, Table2 } from 'lucide-react'
import type { DealsViewMode, User } from '../types'
import { Select, type SelectOption } from './Select'

interface BoardToolbarProps {
  users: User[]
  currentUserId: string
  ownerFilter: string
  attentionOnly: boolean
  viewMode: DealsViewMode
  attentionCount: number
  onOwnerFilterChange: (value: string) => void
  onAttentionToggle: () => void
  onViewModeChange: (mode: DealsViewMode) => void
  onCreateDeal?: () => void
}

export function BoardToolbar({
  users,
  currentUserId,
  ownerFilter,
  attentionOnly,
  viewMode,
  attentionCount,
  onOwnerFilterChange,
  onAttentionToggle,
  onViewModeChange,
  onCreateDeal,
}: BoardToolbarProps) {
  const ownerOptions: SelectOption[] = [
    { value: 'all', label: 'Все сделки' },
    { value: currentUserId, label: 'Мои сделки' },
    ...users
      .filter((user) => user.id !== currentUserId)
      .map((user) => ({
        value: user.id,
        label: user.name,
        hint: roleLabel(user.role),
      })),
  ]

  const modes: Array<{ value: DealsViewMode; label: string; icon: typeof Table2 }> = [
    { value: 'board', label: 'Канбан', icon: KanbanSquare },
    { value: 'table', label: 'Таблица', icon: Table2 },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={ownerFilter}
        options={ownerOptions}
        onChange={onOwnerFilterChange}
        ariaLabel="Фильтр по ответственному"
        size="sm"
        className="w-44"
      />

      <button
        type="button"
        onClick={onAttentionToggle}
        aria-pressed={attentionOnly}
        className={[
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors',
          attentionOnly
            ? 'border-red-300 bg-red-50 font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
            : 'border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-900',
        ].join(' ')}
      >
        <AlertTriangle className="size-4" aria-hidden="true" />
        Требуют внимания
        {attentionCount > 0 && (
          <span
            className={[
              'rounded-full px-1.5 text-xs font-semibold tabular-nums',
              attentionOnly ? 'bg-red-600 text-white' : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
            ].join(' ')}
          >
            {attentionCount}
          </span>
        )}
      </button>

      <div className="flex rounded-lg border border-stone-200 p-0.5 dark:border-stone-800">
        {modes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onViewModeChange(value)}
            aria-pressed={viewMode === value}
            className={[
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors',
              viewMode === value
                ? 'bg-brand-600 font-medium text-white dark:bg-brand-500 dark:text-white'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100',
            ].join(' ')}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCreateDeal}
        className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-600 dark:bg-brand-500 dark:text-white px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 dark:hover:bg-brand-400 active:scale-95"
      >
        <Plus className="size-4" aria-hidden="true" />
        Новая сделка
      </button>
    </div>
  )
}
