import { Navigate, useSearchParams } from 'react-router-dom'
import {
  useCustomFieldMutations,
  useCustomFields,
  useDeals,
  useLossReasonMutations,
  useLossReasons,
  useOrgMutations,
  useStageMutations,
  useStages,
  useUserMutations,
  useUsers,
} from '@/api/queries'
import { canAdmin } from '@/lib/roles'
import { useSession } from '@/routes/AppLayout'
import { AdminSettings } from '@/sections/admin/components/AdminSettings'
import type { AdminTab } from '@/sections/admin/types'

const tabs: AdminTab[] = ['pipeline', 'users', 'fields', 'loss-reasons', 'org']

export function AdminPage() {
  const { me } = useSession()
  const [searchParams] = useSearchParams()

  const stages = useStages().data ?? []
  const users = useUsers().data ?? []
  const deals = useDeals().data ?? []
  const customFields = useCustomFields().data ?? []
  const lossReasons = useLossReasons().data ?? []

  const stageMutations = useStageMutations()
  const userMutations = useUserMutations()
  const fieldMutations = useCustomFieldMutations()
  const reasonMutations = useLossReasonMutations()
  const orgMutations = useOrgMutations()

  if (!canAdmin(me.user.role)) return <Navigate to="/deals" replace />

  const tabParam = searchParams.get('tab') as AdminTab | null
  const initialTab = tabParam && tabs.includes(tabParam) ? tabParam : undefined

  // Счётчики считаются из данных, а не хранятся: иначе они разъедутся
  // с реальностью на первом же перемещении сделки.
  const ordered = [...stages].sort((a, b) => a.order - b.order)
  const stageRows = ordered.map((stage) => ({
    ...stage,
    dealCount: deals.filter((deal) => deal.stageId === stage.id).length,
  }))

  const openStageIds = new Set(stages.filter((stage) => !stage.isClosing).map((s) => s.id))
  const userRows = users.map((user) => ({
    ...user,
    dealCount:
      user.status === 'active'
        ? deals.filter((deal) => deal.ownerId === user.id && openStageIds.has(deal.stageId)).length
        : 0,
  }))

  return (
    <AdminSettings
      stages={stageRows}
      users={userRows}
      customFields={customFields}
      lossReasons={lossReasons}
      currentUserId={me.user.id}
      currentUserRole={me.user.role}
      initialTab={initialTab}
      org={{ name: me.org.name, currency: me.org.currency, hasDemoData: me.onboarding.hasDemoData }}
      onUpdateOrg={(patch) => orgMutations.update.mutate(patch)}
      onLoadDemo={() => orgMutations.loadDemo.mutate()}
      onClearDemo={() => orgMutations.clearDemo.mutate()}
      isDemoPending={orgMutations.loadDemo.isPending || orgMutations.clearDemo.isPending}
      onReorderStage={(stageId, newIndex) => {
        const ids = ordered.filter((stage) => !stage.isClosing).map((stage) => stage.id)
        const from = ids.indexOf(stageId)
        if (from === -1) return
        ids.splice(from, 1)
        ids.splice(newIndex, 0, stageId)
        stageMutations.reorder.mutate([...ids, ...ordered.filter((stage) => stage.isClosing).map((s) => s.id)])
      }}
      onRenameStage={(id, name) => stageMutations.rename.mutate({ id, name })}
      onAddStage={(name) => stageMutations.add.mutate(name)}
      onDeleteStage={(stageId) => {
        // Сделки с удаляемой стадии уезжают на соседнюю слева (или первую другую открытую)
        const stage = stageRows.find((item) => item.id === stageId)
        if (!stage) return
        let moveTo: string | undefined
        if (stage.dealCount > 0) {
          const index = ordered.findIndex((item) => item.id === stageId)
          const fallback = ordered.find((item) => item.id !== stageId && !item.isClosing) ?? ordered.find((item) => item.id !== stageId)
          moveTo = (index > 0 ? ordered[index - 1] : fallback)?.id
        }
        stageMutations.remove.mutate({ id: stageId, moveTo })
      }}
      onChangeUserRole={(id, role) => userMutations.update.mutate({ id, role })}
      onInviteUser={async (invite) => {
        const result = await userMutations.invite.mutateAsync(invite)
        return result.inviteUrl
      }}
      onResendInvite={async (id) => (await userMutations.resendInvite.mutateAsync(id)).inviteUrl}
      onResetLink={async (id) => (await userMutations.resetLink.mutateAsync(id)).resetUrl}
      onCancelInvite={(id) => userMutations.cancelInvite.mutate(id)}
      onTransferOwnership={(id) => userMutations.transferOwnership.mutate(id)}
      onDisableUser={(id) => userMutations.update.mutate({ id, status: 'disabled' })}
      onEnableUser={(id) => userMutations.update.mutate({ id, status: 'active' })}
      onAddField={(draft) => fieldMutations.add.mutate(draft)}
      onToggleFieldRequired={(id, isRequired) => fieldMutations.update.mutate({ id, isRequired })}
      onDeleteField={(id) => fieldMutations.remove.mutate(id)}
      onAddFieldOption={(id, option) => {
        const field = customFields.find((item) => item.id === id)
        if (field) fieldMutations.update.mutate({ id, options: [...field.options, option] })
      }}
      onRemoveFieldOption={(id, option) => {
        const field = customFields.find((item) => item.id === id)
        if (field) fieldMutations.update.mutate({ id, options: field.options.filter((item) => item !== option) })
      }}
      onAddLossReason={(name) => reasonMutations.add.mutate(name)}
      onRenameLossReason={(id, name) => reasonMutations.rename.mutate({ id, name })}
      onDeleteLossReason={(id) => reasonMutations.remove.mutate(id)}
    />
  )
}
