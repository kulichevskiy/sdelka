import { useEffect, useRef, useState } from 'react'
import { ChevronsUpDown, LogOut, Settings, User } from 'lucide-react'

export interface ShellUser {
  name: string
  role?: string
  avatarUrl?: string
}

export interface UserMenuProps {
  user: ShellUser
  onLogout?: () => void
  onProfile?: () => void
  /** Переход в админку из меню */
  onAdmin?: () => void
  /** Показывать ли пункт «Админка». Роли проверяет приложение, оболочка только скрывает пункт */
  canAccessAdmin?: boolean
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function UserMenu({ user, onLogout, onProfile, onAdmin, canAccessAdmin = true }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const menuItems = [
    { label: 'Профиль и настройки', icon: User, onSelect: onProfile },
    ...(canAccessAdmin ? [{ label: 'Админка', icon: Settings, onSelect: onAdmin }] : []),
    { label: 'Выйти', icon: LogOut, onSelect: onLogout },
  ]

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-20 mb-2 w-full min-w-48 overflow-hidden rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-800 dark:bg-stone-900"
        >
          {menuItems.map(({ label, icon: Icon, onSelect }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onSelect?.()
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Icon className="size-4 text-stone-400 dark:text-stone-500" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {initials(user.name)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-stone-900 dark:text-stone-100">{user.name}</span>
          {user.role && (
            <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{user.role}</span>
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-stone-400" aria-hidden="true" />
      </button>
    </div>
  )
}
