import { useMemo, useState } from 'react'
import { SearchX } from 'lucide-react'
import type { DealOutcome, DealsProps, DealsViewMode } from '../types'
import { BoardColumn } from './BoardColumn'
import { BoardToolbar } from './BoardToolbar'
import { CloseDealDialog } from './CloseDealDialog'
import { DealCard } from './DealCard'
import { DealPanel } from './DealPanel'
import { DealsTable, type SortDirection, type SortField } from './DealsTable'
import { attentionOf, formatMoney } from './deals-utils'

/** Типографика продукта: Graphik (product/design-system/typography.json), задаётся оболочкой */
export function DealsBoard({
  currency: orgCurrency,
  initialDealId = null,
  deals,
  stages,
  users,
  companies,
  contacts,
  tasks,
  activities,
  currentUserId,
  today,
  customFields = [],
  lossReasons = [],
  emptyState,
  toolbarActions,
  onOpenDeal,
  onMoveDeal,
  onCreateDeal,
  onUpdateDeal,
  onAddTask,
  onToggleTask,
  onLogActivity,
}: DealsProps) {
  const [viewMode, setViewMode] = useState<DealsViewMode>('board')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [openDealId, setOpenDealId] = useState<string | null>(initialDealId)
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)
  const [dropStageId, setDropStageId] = useState<string | null>(null)
  const [closingDealId, setClosingDealId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('amount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const orderedStages = useMemo(
    () => [...stages].sort((a, b) => a.order - b.order),
    [stages],
  )

  const closingStageIds = useMemo(
    () => new Set(stages.filter((stage) => stage.isClosing).map((stage) => stage.id)),
    [stages],
  )

  const attentionCount = useMemo(
    () =>
      deals.filter(
        (deal) => attentionOf(deal, tasks, today, closingStageIds.has(deal.stageId)) !== null,
      ).length,
    [deals, tasks, today, closingStageIds],
  )

  const visibleDeals = useMemo(
    () =>
      deals.filter((deal) => {
        if (ownerFilter !== 'all' && deal.ownerId !== ownerFilter) return false
        if (
          attentionOnly &&
          attentionOf(deal, tasks, today, closingStageIds.has(deal.stageId)) === null
        ) {
          return false
        }
        return true
      }),
    [deals, ownerFilter, attentionOnly, tasks, today, closingStageIds],
  )

  const sortedDeals = useMemo(() => {
    const factor = sortDirection === 'asc' ? 1 : -1
    return [...visibleDeals].sort((a, b) => {
      if (sortField === 'amount') return (a.amount - b.amount) * factor
      return (a.expectedCloseDate ?? "").localeCompare(b.expectedCloseDate ?? "") * factor
    })
  }, [visibleDeals, sortField, sortDirection])

  const currency = orgCurrency ?? deals[0]?.currency ?? 'RUB'
  const openDeal = deals.find((deal) => deal.id === openDealId)
  const closingDeal = deals.find((deal) => deal.id === closingDealId)
  const totalVisible = visibleDeals.reduce((sum, deal) => sum + deal.amount, 0)

  function handleOpen(dealId: string) {
    setOpenDealId(dealId)
    onOpenDeal?.(dealId)
  }

  /** Общий вход для переноса: drag-and-drop на десктопе и выбор стадии в панели на телефоне */
  function requestMove(dealId: string, stageId: string) {
    const deal = deals.find((item) => item.id === dealId)
    if (!deal || deal.stageId === stageId) return

    // Перенос в закрывающую стадию требует явного исхода — спрашиваем перед сохранением
    if (closingStageIds.has(stageId)) {
      setClosingDealId(dealId)
      return
    }
    onMoveDeal?.(dealId, stageId)
  }

  function handleDrop(stageId: string) {
    setDropStageId(null)
    const dealId = draggedDealId
    setDraggedDealId(null)
    if (dealId) requestMove(dealId, stageId)
  }

  function confirmClose(outcome: DealOutcome, lostReason?: string) {
    const stageId = orderedStages.find((stage) => stage.isClosing)?.id
    if (closingDealId && stageId) onMoveDeal?.(closingDealId, stageId, outcome, lostReason)
    setClosingDealId(null)
  }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-3 border-b border-stone-200 px-4 py-4 sm:px-6 dark:border-stone-800">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Сделки
          </h1>
          <p className="font-mono text-sm tabular-nums text-stone-500 dark:text-stone-400">
            {visibleDeals.length} · {formatMoney(totalVisible, currency)}
          </p>
        </div>

        <BoardToolbar
          users={users}
          currentUserId={currentUserId}
          ownerFilter={ownerFilter}
          attentionOnly={attentionOnly}
          viewMode={viewMode}
          attentionCount={attentionCount}
          onOwnerFilterChange={setOwnerFilter}
          onAttentionToggle={() => setAttentionOnly((value) => !value)}
          onViewModeChange={setViewMode}
          onCreateDeal={onCreateDeal}
          actions={toolbarActions}
        />
      </header>

      {deals.length === 0 && emptyState ? (
        emptyState
      ) : visibleDeals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
          <SearchX className="size-8 text-stone-300 dark:text-stone-700" aria-hidden="true" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Под выбранные фильтры не попала ни одна сделка
          </p>
          <button
            type="button"
            onClick={() => {
              setOwnerFilter('all')
              setAttentionOnly(false)
            }}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-900"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : viewMode === 'board' ? (
        <div className="min-h-0 flex-1 snap-x snap-mandatory scroll-px-4 overflow-x-auto p-4 sm:snap-none sm:p-6">
          <div className="flex h-full min-h-0 gap-3">
            {orderedStages.map((stage) => {
              const stageDeals = visibleDeals.filter((deal) => deal.stageId === stage.id)
              const total = stageDeals.reduce((sum, deal) => sum + deal.amount, 0)

              return (
                <BoardColumn
                  key={stage.id}
                  name={stage.name}
                  count={stageDeals.length}
                  total={total}
                  currency={currency}
                  isDropTarget={dropStageId === stage.id}
                  isEmpty={stageDeals.length === 0}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDropStageId(stage.id)
                  }}
                  onDragLeave={() => setDropStageId((id) => (id === stage.id ? null : id))}
                  onDrop={() => handleDrop(stage.id)}
                >
                  {stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      company={companies.find((company) => company.id === deal.companyId)}
                      owner={users.find((user) => user.id === deal.ownerId)}
                      tasks={tasks}
                      today={today}
                      isClosingStage={stage.isClosing}
                      isDragging={draggedDealId === deal.id}
                      onOpen={() => handleOpen(deal.id)}
                      onDragStart={() => setDraggedDealId(deal.id)}
                      onDragEnd={() => {
                        setDraggedDealId(null)
                        setDropStageId(null)
                      }}
                    />
                  ))}
                </BoardColumn>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <DealsTable
            deals={sortedDeals}
            stages={stages}
            companies={companies}
            users={users}
            tasks={tasks}
            today={today}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onOpenDeal={handleOpen}
          />
        </div>
      )}

      {openDeal && (
        <DealPanel
          deal={openDeal}
          stage={stages.find((stage) => stage.id === openDeal.stageId)}
          companies={companies}
          contacts={contacts}
          users={users}
          tasks={tasks}
          activities={activities}
          today={today}
          currentUserId={currentUserId}
          stages={orderedStages}
          customFields={customFields}
          onChangeStage={(stageId) => requestMove(openDeal.id, stageId)}
          onClose={() => setOpenDealId(null)}
          onUpdateDeal={onUpdateDeal}
          onAddTask={onAddTask}
          onToggleTask={onToggleTask}
          onLogActivity={onLogActivity}
        />
      )}

      {closingDeal && (
        <CloseDealDialog
          dealTitle={closingDeal.title}
          lossReasons={lossReasons}
          onConfirm={confirmClose}
          onCancel={() => setClosingDealId(null)}
        />
      )}
    </div>
  )
}
