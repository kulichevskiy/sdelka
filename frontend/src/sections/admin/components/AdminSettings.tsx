import { useState } from 'react'
import { Building, CircleSlash, KanbanSquare, SlidersHorizontal, Users } from 'lucide-react'
import { OrgTab } from './OrgTab'
import type { AdminProps, AdminTab } from '../types'
import { FieldsTab } from './FieldsTab'
import { LossReasonsTab } from './LossReasonsTab'
import { PipelineTab } from './PipelineTab'
import { UsersTab } from './UsersTab'

/** Типографика продукта: Graphik (product/design-system/typography.json), задаётся оболочкой */
export function AdminSettings({
  stages,
  users,
  customFields,
  lossReasons,
  currentUserId,
  currentUserRole,
  initialTab,
  org,
  onUpdateOrg,
  onLoadDemo,
  onClearDemo,
  isDemoPending,
  onResendInvite,
  onResetLink,
  onCancelInvite,
  onTransferOwnership,
  onReorderStage,
  onRenameStage,
  onAddStage,
  onDeleteStage,
  onChangeUserRole,
  onInviteUser,
  onDisableUser,
  onEnableUser,
  onAddField,
  onToggleFieldRequired,
  onDeleteField,
  onAddFieldOption,
  onRemoveFieldOption,
  onAddLossReason,
  onRenameLossReason,
  onDeleteLossReason,
}: AdminProps) {
  const [tab, setTab] = useState<AdminTab>(initialTab ?? 'pipeline')

  const tabs: Array<{ value: AdminTab; label: string; icon: typeof Users; count: number | null }> = [
    { value: 'pipeline', label: 'Воронка', icon: KanbanSquare, count: stages.length },
    { value: 'users', label: 'Пользователи', icon: Users, count: users.length },
    { value: 'fields', label: 'Поля', icon: SlidersHorizontal, count: customFields.length },
    {
      value: 'loss-reasons',
      label: 'Причины проигрыша',
      icon: CircleSlash,
      count: lossReasons.length,
    },
    ...(org ? [{ value: 'org' as const, label: 'Организация', icon: Building, count: null }] : []),
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-stone-200 px-4 pt-4 sm:px-6 dark:border-stone-800">
        <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Админка
        </h1>

        <nav aria-label="Разделы настроек" className="mt-3 -mb-px flex gap-1 overflow-x-auto">
          {tabs.map(({ value, label, icon: Icon, count }) => {
            const isActive = tab === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'border-brand-600 font-medium text-brand-700 dark:border-brand-400 dark:text-brand-200'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100',
                ].join(' ')}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
                {count !== null && (
                  <span
                    className={[
                      'text-xs tabular-nums',
                      isActive ? 'opacity-70' : 'text-stone-400 dark:text-stone-600',
                    ].join(' ')}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {tab === 'pipeline' && (
          <PipelineTab
            stages={stages}
            onReorderStage={onReorderStage}
            onRenameStage={onRenameStage}
            onAddStage={onAddStage}
            onDeleteStage={onDeleteStage}
          />
        )}

        {tab === 'users' && (
          <UsersTab
            users={users}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onChangeUserRole={onChangeUserRole}
            onInviteUser={onInviteUser}
            onDisableUser={onDisableUser}
            onEnableUser={onEnableUser}
            onResendInvite={onResendInvite}
            onResetLink={onResetLink}
            onCancelInvite={onCancelInvite}
            onTransferOwnership={onTransferOwnership}
          />
        )}

        {tab === 'fields' && (
          <FieldsTab
            customFields={customFields}
            onAddField={onAddField}
            onToggleFieldRequired={onToggleFieldRequired}
            onDeleteField={onDeleteField}
            onAddFieldOption={onAddFieldOption}
            onRemoveFieldOption={onRemoveFieldOption}
          />
        )}

        {tab === 'org' && org && (
          <OrgTab
            org={org}
            isOwner={currentUserRole === 'owner'}
            onUpdateOrg={onUpdateOrg}
            onLoadDemo={onLoadDemo}
            onClearDemo={onClearDemo}
            isDemoPending={isDemoPending}
          />
        )}

        {tab === 'loss-reasons' && (
          <LossReasonsTab
            lossReasons={lossReasons}
            onAddLossReason={onAddLossReason}
            onRenameLossReason={onRenameLossReason}
            onDeleteLossReason={onDeleteLossReason}
          />
        )}
      </div>
    </div>
  )
}
