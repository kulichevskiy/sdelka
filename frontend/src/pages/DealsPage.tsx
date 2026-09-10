import { useSearchParams } from 'react-router-dom'
import {
  useActivities,
  useCompanies,
  useContacts,
  useCreateActivity,
  useCreateTask,
  useCustomFields,
  useDeals,
  useLossReasons,
  useMoveDeal,
  useOrgMutations,
  useStages,
  useTasks,
  useUpdateDeal,
  useUpdateTask,
  useUsers,
} from '@/api/queries'
import { EmptyState } from '@/components/EmptyState'
import { BoardIllustration } from '@/components/illustrations'
import { Button } from '@/components/ui'
import { canAdmin } from '@/lib/roles'
import { useSession } from '@/routes/AppLayout'
import { DealsBoard } from '@/sections/deals/components/DealsBoard'

export function DealsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const openDealId = searchParams.get('deal')
  const { me, today, openCreateDeal } = useSession()

  const deals = useDeals()
  const stages = useStages().data ?? []
  const users = useUsers().data ?? []
  const companies = useCompanies().data ?? []
  const contacts = useContacts().data ?? []
  const tasks = useTasks().data ?? []
  const activities = useActivities().data ?? []
  const customFields = useCustomFields().data ?? []
  const lossReasons = useLossReasons().data ?? []

  const moveDeal = useMoveDeal()
  const updateDeal = useUpdateDeal()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const createActivity = useCreateActivity()
  const { loadDemo } = useOrgMutations()

  const dealList = deals.data ?? []

  return (
    <DealsBoard
      key={openDealId ?? 'board'}
      initialDealId={openDealId}
      deals={dealList.map((deal) => ({ ...deal, currency: me.org.currency, expectedCloseDate: deal.expectedCloseDate ?? '' }))}
      stages={stages}
      users={users
        .filter((user) => user.status !== 'disabled')
        .map((user) => ({ id: user.id, name: user.name, role: user.role, avatarUrl: null }))}
      companies={companies}
      contacts={contacts}
      tasks={tasks}
      activities={activities
        .filter((activity) => activity.dealId)
        .map((activity) => ({
          id: activity.id,
          dealId: activity.dealId ?? '',
          type: activity.type,
          authorId: activity.authorId,
          date: activity.date,
          note: activity.note,
        }))}
      currentUserId={me.user.id}
      today={today}
      customFields={customFields.filter((field) => field.entity === 'deal')}
      lossReasons={lossReasons.map((reason) => reason.name)}
      emptyState={
        deals.isSuccess ? (
          <EmptyState
            illustration={<BoardIllustration />}
            title="Сделок ещё нет"
            description="Канбан покажет, на какой стадии каждая сделка и что по ней делать дальше. Начните с первой — или посмотрите на демо-данных."
            action={<Button onClick={openCreateDeal}>Создать сделку</Button>}
            secondary={
              canAdmin(me.user.role) && !me.onboarding.hasDemoData ? (
                <Button variant="secondary" loading={loadDemo.isPending} onClick={() => loadDemo.mutate()}>
                  Заполнить демо-данными
                </Button>
              ) : undefined
            }
          />
        ) : null
      }
      onOpenDeal={(dealId) => setSearchParams({ deal: dealId }, { replace: true })}
      onMoveDeal={(id, stageId, outcome, lostReason) => moveDeal.mutate({ id, stageId, outcome, lostReason })}
      onUpdateDeal={(id, patch) =>
        updateDeal.mutate({
          id,
          patch: { ...patch, expectedCloseDate: patch.expectedCloseDate === '' ? null : patch.expectedCloseDate },
        })
      }
      onAddTask={(dealId, draft) => createTask.mutate({ dealId, ...draft })}
      onToggleTask={(id, isDone) => updateTask.mutate({ id, patch: { isDone } })}
      onLogActivity={(dealId, draft) => {
        const deal = dealList.find((item) => item.id === dealId)
        if (!deal) return
        createActivity.mutate({ companyId: deal.companyId, contactId: deal.contactId, dealId, ...draft })
      }}
      onCreateDeal={openCreateDeal}
    />
  )
}
