import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Building2, CalendarCheck, Circle, KanbanSquare, Plus, Search, Settings, Users } from 'lucide-react'
import { UserMenu, type ShellUser } from './UserMenu'

/**
 * Иконка по умолчанию для раздела, если она не передана в navigationItems.
 * Подбирается по ссылке или названию: у списка разделов иконки должны быть всегда,
 * а вызывающий код не обязан их знать.
 */
const fallbackIcons: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /today|сегодня/i, icon: CalendarCheck },
  { match: /deal|сделк/i, icon: KanbanSquare },
  { match: /contact|company|контакт|компан/i, icon: Building2 },
  { match: /team|команд|user|пользовател/i, icon: Users },
  { match: /admin|setting|админ|настрой/i, icon: Settings },
]

export function iconFor(item: NavigationItem): LucideIcon {
  if (item.icon) return item.icon
  const haystack = `${item.href} ${item.label}`
  return fallbackIcons.find((entry) => entry.match.test(haystack))?.icon ?? Circle
}

/** Заголовочный шрифт продукта — см. product/design-system/typography.json */
export const HEADING_FONT = 'Graphik, system-ui, sans-serif'

export interface NavigationItem {
  label: string
  href: string
  icon?: LucideIcon
  /** Число рядом с разделом, например задачи на сегодня */
  badge?: number
  /** Просроченные задачи — бейдж становится красным */
  badgeUrgent?: boolean
  isActive?: boolean
}

export interface MainNavProps {
  navigationItems: NavigationItem[]
  user?: ShellUser
  productName?: string
  searchQuery?: string
  searchPlaceholder?: string
  createLabel?: string
  onSearchChange?: (query: string) => void
  onNavigate?: (href: string) => void
  onCreate?: () => void
  onLogout?: () => void
  onAdmin?: () => void
  onSettings?: () => void
  canAccessAdmin?: boolean
  extra?: ReactNode
  searchResults?: ReactNode
}

export function MainNav({
  navigationItems,
  user,
  productName = 'Sales HQ',
  searchQuery = '',
  searchPlaceholder = 'Поиск по CRM',
  createLabel = 'Создать',
  onSearchChange,
  onNavigate,
  onCreate,
  onLogout,
  onAdmin,
  onSettings,
  canAccessAdmin,
  extra,
  searchResults,
}: MainNavProps) {
  return (
    <div className="flex h-full flex-col gap-4 bg-white p-3 dark:bg-stone-950">
      <div className="flex items-center gap-2 px-2 pt-1">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white dark:bg-brand-500 dark:text-white">
          S
        </span>
        <span
          className="truncate text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100"
          style={{ fontFamily: HEADING_FONT }}
        >
          {productName}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pr-2.5 pl-8 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/25 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:bg-stone-900"
          />
          {searchResults}
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
        >
          <Plus className="size-4" aria-hidden="true" />
          {createLabel}
        </button>
      </div>

      <nav aria-label="Разделы" className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {navigationItems.map((item) => {
            const Icon = iconFor(item)
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => onNavigate?.(item.href)}
                  aria-current={item.isActive ? 'page' : undefined}
                  className={[
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                    item.isActive
                      ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-200'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100',
                  ].join(' ')}
                >
                  <Icon
                    className={[
                      'size-4 shrink-0',
                      item.isActive ? 'text-stone-900 dark:text-stone-200' : 'text-stone-400',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={[
                        'inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white',
                        item.badgeUrgent ? 'bg-red-600' : 'bg-brand-600 dark:bg-brand-500 dark:text-white',
                      ].join(' ')}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {extra && <div className="mt-4">{extra}</div>}
      </nav>

      {user && (
        <div className="border-t border-stone-200 pt-2 dark:border-stone-800">
          <UserMenu
            user={user}
            onLogout={onLogout}
            onAdmin={onAdmin}
            onProfile={onSettings}
            canAccessAdmin={canAccessAdmin}
          />
        </div>
      )}
    </div>
  )
}
