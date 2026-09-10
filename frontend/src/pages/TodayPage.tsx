import { useNavigate } from 'react-router-dom'
import { useCompanies, useCreateTask, useDeals, useOrgMutations, useStages, useTasks, useUpdateTask } from '@/api/queries'
import { EmptyState } from '@/components/EmptyState'
import { CalendarIllustration } from '@/components/illustrations'
import { OnboardingChecklist } from '@/components/onboarding/Checklist'
import { Button } from '@/components/ui'
import { canAdmin } from '@/lib/roles'
import { useSession } from '@/routes/AppLayout'
import { TodayBoard } from '@/sections/today/components/TodayBoard'
import type { TodayDeal, TodayTask } from '@/sections/today/types'

export function TodayPage() {
  const navigate = useNavigate()
  const { me, today, openCreateDeal, onboardingSteps } = useSession()
  const deals = useDeals().data ?? []
  const tasks = useTasks().data ?? []
  const stages = useStages().data ?? []
  const companies = useCompanies().data ?? []
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const { dismissOnboarding, loadDemo } = useOrgMutations()

  const stageById = new Map(stages.map((stage) => [stage.id, stage]))
  const companyById = new Map(companies.map((company) => [company.id, company]))

  // Рабочий стол личный: только сделки и задачи текущего пользователя,
  // и только по незакрытым сделкам — закрытым следующий шаг не нужен.
  const myDeals: TodayDeal[] = deals
    .filter((deal) => deal.ownerId === me.user.id && !stageById.get(deal.stageId)?.isClosing)
    .map((deal) => ({
      id: deal.id,
      title: deal.title,
      companyName: companyById.get(deal.companyId)?.name ?? '',
      stageName: stageById.get(deal.stageId)?.name ?? '',
      amount: deal.amount,
      currency: me.org.currency,
      ownerId: deal.ownerId,
    }))

  const visibleDealIds = new Set(myDeals.map((deal) => deal.id))
  const myTasks: TodayTask[] = tasks.filter(
    (task) => task.assigneeId === me.user.id && visibleDealIds.has(task.dealId),
  )

  const showChecklist = !me.onboarding.dismissed && me.onboarding.items.some((item) => !item.done)

  return (
    <TodayBoard
      currentUser={{ id: me.user.id, name: me.user.name, role: me.user.role }}
      deals={myDeals}
      tasks={myTasks}
      today={today}
      header={
        showChecklist ? (
          <OnboardingChecklist
            onboarding={me.onboarding}
            steps={onboardingSteps}
            canAdmin={canAdmin(me.user.role)}
            onLoadDemo={() => loadDemo.mutate()}
            isLoadingDemo={loadDemo.isPending}
            onDismiss={() => dismissOnboarding.mutate()}
          />
        ) : null
      }
      emptyState={
        <EmptyState
          illustration={<CalendarIllustration />}
          title={deals.length === 0 ? 'Рабочий стол пока пуст' : 'У вас нет открытых сделок'}
          description={
            deals.length === 0
              ? 'Здесь собираются задачи на сегодня, просроченные и сделки без следующего шага. Появится, как только будет первая сделка.'
              : 'Сделки коллег сюда не попадают. Возьмите сделку в работу или создайте новую.'
          }
          action={<Button onClick={openCreateDeal}>Создать сделку</Button>}
          secondary={
            deals.length > 0 ? (
              <Button variant="secondary" onClick={() => navigate('/deals')}>
                Все сделки
              </Button>
            ) : undefined
          }
          className="py-6"
        />
      }
      onToggleTask={(id, isDone) => updateTask.mutate({ id, patch: { isDone } })}
      onRescheduleTask={(id, dueDate) => updateTask.mutate({ id, patch: { dueDate } })}
      onAddNextStep={(dealId, draft) => createTask.mutate({ dealId, title: draft.title, dueDate: draft.dueDate })}
      onOpenDeal={(dealId) => navigate(`/deals?deal=${dealId}`)}
    />
  )
}
