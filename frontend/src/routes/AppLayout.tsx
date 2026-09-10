import { createContext, use, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthMutations, useTasks } from '@/api/queries'
import type { Me } from '@/api/types'
import { CreateDealDialog } from '@/app/CreateDealDialog'
import { SearchResults } from '@/app/SearchResults'
import { OnboardingSidebarCard, type ChecklistStep } from '@/components/onboarding/Checklist'
import { todayLocal } from '@/lib/dates'
import { canAdmin, roleLabel } from '@/lib/roles'
import { useTheme } from '@/lib/theme'
import { AppShell } from '@/shell/components/AppShell'

const sections = [
  // Сделки первыми: это стартовый экран после входа
  { label: 'Сделки', href: '/deals' },
  { label: 'Сегодня', href: '/today' },
  { label: 'Контакты', href: '/contacts' },
]

interface SessionValue {
  me: Me
  today: string
  /** Открыть диалог создания сделки из любого раздела */
  openCreateDeal: () => void
  /** Шаги чеклиста с действиями — общие для «Сегодня» и сайдбара */
  onboardingSteps: ChecklistStep[]
}

const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = use(SessionContext)
  if (!value) throw new Error('useSession вне AppLayout')
  return value
}

/** Оболочка защищённой части: шелл, поиск, диалог создания, контекст сессии */
export function AppLayout({ me }: { me: Me }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuthMutations()
  const { theme, setTheme } = useTheme()
  const tasks = useTasks().data ?? []

  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const today = todayLocal()

  // Бейдж на «Сегодня»: задачи текущего пользователя на сегодня и просроченные
  const openTasks = tasks.filter((task) => !task.isDone && task.assigneeId === me.user.id)
  const dueToday = openTasks.filter((task) => task.dueDate <= today).length
  const hasOverdue = openTasks.some((task) => task.dueDate < today)

  const navigationItems = sections.map((section) => ({
    ...section,
    isActive: location.pathname.startsWith(section.href),
    badge: section.href === '/today' ? dueToday : undefined,
    badgeUrgent: section.href === '/today' ? hasOverdue : undefined,
  }))

  const isAdmin = canAdmin(me.user.role)

  const onboardingSteps = useMemo<ChecklistStep[]>(
    () => [
      {
        key: 'deal',
        title: 'Создать первую сделку',
        hint: 'Она появится на канбане и на рабочем столе',
        actionLabel: 'Создать',
        onAction: () => setIsCreating(true),
      },
      {
        key: 'contact',
        title: 'Добавить контакт',
        hint: 'Человек, с которым вы общаетесь в компании клиента',
        actionLabel: 'К контактам',
        onAction: () => navigate('/contacts?create=contact'),
      },
      {
        key: 'task',
        title: 'Поставить следующий шаг',
        hint: 'Задача с датой у сделки — так ничего не потеряется',
        actionLabel: 'К сделкам',
        onAction: () => navigate('/deals'),
      },
      ...(isAdmin
        ? [
            {
              key: 'pipeline' as const,
              title: 'Настроить стадии воронки',
              hint: 'Переименуйте или добавьте стадии под свой процесс',
              actionLabel: 'В админку',
              onAction: () => navigate('/admin?tab=pipeline'),
            },
            {
              key: 'invite' as const,
              title: 'Пригласить коллегу',
              hint: 'CRM оживает, когда в ней работает вся команда',
              actionLabel: 'Пригласить',
              onAction: () => navigate('/admin?tab=users'),
            },
          ]
        : []),
    ],
    [isAdmin, navigate],
  )

  const showSidebarCard =
    !me.onboarding.dismissed && me.onboarding.items.some((item) => !item.done) && location.pathname !== '/today'

  const searchResults = search.trim() ? (
    <SearchResults
      query={search}
      className="absolute top-full left-0 z-40 mt-1 w-full lg:w-72"
      onPick={(target) => {
        setSearch('')
        if (target.kind === 'deal') navigate(`/deals?deal=${target.id}`)
        else if (target.kind === 'contact') navigate(`/contacts?contact=${target.id}`)
        else navigate(`/contacts?company=${target.id}`)
      }}
    />
  ) : null

  const session: SessionValue = { me, today, openCreateDeal: () => setIsCreating(true), onboardingSteps }

  return (
    <SessionContext value={session}>
      <AppShell
        navigationItems={navigationItems}
        user={{ name: me.user.name, role: roleLabel(me.user.role) }}
        productName={me.org.name || 'Sales HQ'}
        searchQuery={search}
        onSearchChange={setSearch}
        onNavigate={(href) => navigate(href)}
        onCreate={() => setIsCreating(true)}
        onAdmin={() => navigate('/admin')}
        onSettings={() => navigate('/settings')}
        canAccessAdmin={isAdmin}
        onLogout={() => logout.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })}
        theme={theme}
        onThemeChange={setTheme}
        searchResults={searchResults}
        sidebarExtra={
          showSidebarCard ? (
            <OnboardingSidebarCard onboarding={me.onboarding} steps={onboardingSteps} onOpen={() => navigate('/today')} />
          ) : null
        }
      >
        <Outlet />
      </AppShell>

      {isCreating && (
        <CreateDealDialog
          onClose={() => setIsCreating(false)}
          onCreated={(dealId) => {
            setIsCreating(false)
            navigate(`/deals?deal=${dealId}`)
          }}
        />
      )}
    </SessionContext>
  )
}
