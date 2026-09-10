import { useEffect, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LogOut, Menu, Moon, Plus, Search, Settings, Sun, SunMoon, UserRound, X } from 'lucide-react'
import { HEADING_FONT, MainNav, iconFor, type NavigationItem } from './MainNav'
import { initials, type ShellUser } from './UserMenu'
import { themeLabels, type Theme } from '@/lib/theme'

/** Основной текстовый шрифт продукта — см. product/design-system/typography.json */
const BODY_FONT = 'Graphik, system-ui, sans-serif'

export interface AppShellProps {
  children: ReactNode
  navigationItems: NavigationItem[]
  user?: ShellUser
  productName?: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onNavigate?: (href: string) => void
  onCreate?: () => void
  onLogout?: () => void
  /** Переход в админку из меню пользователя */
  onAdmin?: () => void
  /** Переход в личные настройки */
  onSettings?: () => void
  /** Показывать ли пункт «Админка» в меню. Роли проверяет приложение */
  canAccessAdmin?: boolean
  /** Блок под навигацией в сайдбаре — например, чеклист запуска */
  sidebarExtra?: ReactNode
  /** Результаты поиска, рисуются под полем поиска */
  searchResults?: ReactNode
  theme?: Theme
  onThemeChange?: (theme: Theme) => void
}

const themeIcons: Record<Theme, LucideIcon> = { light: Sun, dark: Moon, system: SunMoon }

/**
 * Десктоп: сайдбар слева. Мобильный: шапка с поиском и «Создать», нижний таб-бар
 * с разделами и пунктом «Ещё» (админка, настройки, тема, выход).
 */
export function AppShell({
  children,
  navigationItems,
  user,
  productName = 'Sales HQ',
  searchQuery = '',
  onSearchChange,
  onNavigate,
  onCreate,
  onLogout,
  onAdmin,
  onSettings,
  canAccessAdmin,
  sidebarExtra,
  searchResults,
  theme = 'system',
  onThemeChange,
}: AppShellProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  useEffect(() => {
    if (!moreOpen && !mobileSearchOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMoreOpen(false)
        setMobileSearchOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [moreOpen, mobileSearchOpen])

  function navigate(href: string) {
    setMoreOpen(false)
    setMobileSearchOpen(false)
    onSearchChange?.('')
    onNavigate?.(href)
  }

  const nextTheme: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
  const ThemeIcon = themeIcons[theme]

  const moreItems: Array<{ label: string; icon: LucideIcon; onSelect?: () => void; hint?: string }> = [
    ...(canAccessAdmin
      ? [{ label: 'Админка', icon: Settings, onSelect: () => (setMoreOpen(false), onAdmin?.()) }]
      : []),
    { label: 'Профиль и настройки', icon: UserRound, onSelect: () => (setMoreOpen(false), onSettings?.()) },
    { label: 'Тема', icon: ThemeIcon, hint: themeLabels[theme], onSelect: () => onThemeChange?.(nextTheme[theme]) },
    { label: 'Выйти', icon: LogOut, onSelect: () => (setMoreOpen(false), onLogout?.()) },
  ]

  return (
    <div
      className="flex h-dvh bg-stone-50 text-stone-900 dark:bg-stone-900 dark:text-stone-100"
      style={{ fontFamily: BODY_FONT }}
    >
      <aside className="hidden w-60 shrink-0 border-r border-stone-200 lg:block dark:border-stone-800">
        <MainNav
          navigationItems={navigationItems}
          user={user}
          productName={productName}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onNavigate={navigate}
          onCreate={onCreate}
          onLogout={onLogout}
          onAdmin={onAdmin}
          onSettings={onSettings}
          canAccessAdmin={canAccessAdmin}
          extra={sidebarExtra}
          searchResults={searchResults}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Мобильная шапка */}
        <header className="flex items-center gap-2 border-b border-stone-200 bg-white px-3 py-2 lg:hidden dark:border-stone-800 dark:bg-stone-950">
          {mobileSearchOpen ? (
            <>
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-stone-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder="Поиск по CRM"
                  aria-label="Поиск по CRM"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pr-2.5 pl-8 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                />
                {searchResults && <div className="absolute top-full left-0 z-40 mt-1 w-full">{searchResults}</div>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileSearchOpen(false)
                  onSearchChange?.('')
                }}
                aria-label="Закрыть поиск"
                className="rounded-md p-2 text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <span className="flex size-7 items-center justify-center rounded-md bg-stone-900 text-xs font-bold text-white dark:bg-stone-100 dark:text-stone-900">
                S
              </span>
              <span className="flex-1 truncate text-sm font-bold tracking-tight" style={{ fontFamily: HEADING_FONT }}>
                {productName}
              </span>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                aria-label="Поиск"
                className="rounded-md p-2 text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                <Search className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onCreate}
                aria-label="Создать"
                className="rounded-md bg-stone-900 p-2 text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                <Plus className="size-5" aria-hidden="true" />
              </button>
            </>
          )}
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>

        {/* Нижний таб-бар */}
        <nav
          aria-label="Разделы"
          className="fixed inset-x-0 bottom-0 z-30 grid border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-stone-800 dark:bg-stone-950"
          style={{ gridTemplateColumns: `repeat(${navigationItems.length + 1}, minmax(0, 1fr))` }}
        >
          {navigationItems.map((item) => {
            const Icon = iconFor(item)
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                aria-current={item.isActive ? 'page' : undefined}
                className={[
                  'relative flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] transition-colors',
                  item.isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400',
                ].join(' ')}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden="true" />
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={[
                        'absolute -top-1.5 -right-2.5 min-w-4 rounded-full px-1 text-[10px] font-semibold tabular-nums text-white',
                        item.badgeUrgent ? 'bg-red-600' : 'bg-stone-900 dark:bg-stone-100 dark:text-stone-900',
                      ].join(' ')}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            className="flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] text-stone-500 transition-colors dark:text-stone-400"
          >
            <Menu className="size-5" aria-hidden="true" />
            Ещё
          </button>
        </nav>

        {/* Шторка «Ещё» */}
        {moreOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-stone-900/40" onClick={() => setMoreOpen(false)} aria-hidden="true" />
            <div
              role="menu"
              className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-stone-200 bg-white p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-2xl dark:border-stone-800 dark:bg-stone-950"
            >
              {user && (
                <div className="flex items-center gap-3 px-3 py-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                    {initials(user.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{user.name}</span>
                    {user.role && (
                      <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{user.role}</span>
                    )}
                  </span>
                </div>
              )}
              {moreItems.map(({ label, icon: Icon, onSelect, hint }) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={onSelect}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <Icon className="size-5 text-stone-400 dark:text-stone-500" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {hint && <span className="text-xs text-stone-400 dark:text-stone-500">{hint}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
