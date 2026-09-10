import { useState } from 'react'
import { Check, Copy, Crown, KeyRound, Mail, MoreHorizontal, ShieldCheck, UserMinus, UserPlus, X } from 'lucide-react'
import { roleLabel } from '@/lib/roles'
import type { TeamUser, UserRole } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { Select } from './Select'
import { dealsLabel, initialsOf, statusLabels } from './admin-utils'
import { useDialogAppear, useFadeIn } from './transitions'

type AssignableRole = Exclude<UserRole, 'owner'>

interface UsersTabProps {
  users: TeamUser[]
  currentUserId: string
  currentUserRole: UserRole
  onChangeUserRole?: (userId: string, role: AssignableRole) => void
  onInviteUser?: (invite: { email: string; role: AssignableRole }) => Promise<string | null> | void
  onDisableUser?: (userId: string) => void
  onEnableUser?: (userId: string) => void
  onResendInvite?: (userId: string) => Promise<string | null>
  onResetLink?: (userId: string) => Promise<string | null>
  onCancelInvite?: (userId: string) => void
  onTransferOwnership?: (userId: string) => void
}

const roleOptions = [
  { value: 'member', label: 'Менеджер по продажам', hint: 'Видит всё, настраивать не может' },
  { value: 'admin', label: 'Админ', hint: 'Доступ к настройкам' },
]

interface LinkDialogState {
  title: string
  description: string
  url: string
}

/** Показ ссылки приглашения или сброса: скопировать и отправить самому, если почта не настроена */
function LinkDialog({ state, onClose }: { state: LinkDialogState; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const backdropRef = useFadeIn()
  const dialogRef = useDialogAppear()

  async function copy() {
    try {
      await navigator.clipboard.writeText(state.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // без clipboard API — пользователь выделит вручную
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div ref={backdropRef} className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={state.title}
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
        className="relative w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-950"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3 right-3 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <h2 className="pr-6 text-base font-semibold text-stone-900 dark:text-stone-100">{state.title}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{state.description}</p>
        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={state.url}
            onFocus={(event) => event.target.select()}
            className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 font-mono text-xs text-stone-700 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
          />
          <button
            type="button"
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function UsersTab({
  users,
  currentUserId,
  currentUserRole,
  onChangeUserRole,
  onInviteUser,
  onDisableUser,
  onEnableUser,
  onResendInvite,
  onResetLink,
  onCancelInvite,
  onTransferOwnership,
}: UsersTabProps) {
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<AssignableRole>('member')
  const [isInviting, setIsInviting] = useState(false)
  const [pendingDisable, setPendingDisable] = useState<TeamUser | null>(null)
  const [pendingTransfer, setPendingTransfer] = useState<TeamUser | null>(null)
  const [pendingCancel, setPendingCancel] = useState<TeamUser | null>(null)
  const [link, setLink] = useState<LinkDialogState | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  const isOwner = currentUserRole === 'owner'

  async function submitInvite() {
    if (!email.trim() || isInviting) return
    const target = email.trim()
    setIsInviting(true)
    try {
      const url = await onInviteUser?.({ email: target, role: inviteRole })
      setEmail('')
      setInviteRole('member')
      if (url) {
        setLink({
          title: 'Приглашение создано',
          description: `Отправьте ссылку на ${target} любым удобным способом. Если почта настроена, письмо уже ушло.`,
          url,
        })
      }
    } finally {
      setIsInviting(false)
    }
  }

  async function resend(user: TeamUser) {
    setMenuFor(null)
    const url = await onResendInvite?.(user.id)
    if (url) {
      setLink({
        title: 'Новая ссылка приглашения',
        description: `Старая ссылка больше не работает. Отправьте эту на ${user.email}.`,
        url,
      })
    }
  }

  async function resetLink(user: TeamUser) {
    setMenuFor(null)
    const url = await onResetLink?.(user.id)
    if (url) {
      setLink({
        title: 'Ссылка для сброса пароля',
        description: `Действует два часа, один раз. Передайте её ${user.name}.`,
        url,
      })
    }
  }

  /** admin не трогает других admin и owner; owner трогает всех, кроме себя */
  function canManage(user: TeamUser) {
    if (user.id === currentUserId) return false
    if (user.role === 'owner') return false
    if (user.role === 'admin' && !isOwner) return false
    return true
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
        <label className="min-w-48 flex-1">
          <span className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">
            Пригласить по почте
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submitInvite()}
            placeholder="имя@компания.ру"
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>

        <div className="w-full sm:w-52">
          <span className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">
            Роль
          </span>
          <Select
            value={inviteRole}
            options={roleOptions}
            onChange={(value) => setInviteRole(value as AssignableRole)}
            ariaLabel="Роль приглашаемого"
            className="mt-1"
          />
        </div>

        <button
          type="button"
          onClick={submitInvite}
          disabled={isInviting || !email.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-stone-800 active:scale-95 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Пригласить
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {users.map((user) => {
          const isSelf = user.id === currentUserId
          const isDisabled = user.status === 'disabled'
          const isInvited = user.status === 'invited'
          const manageable = canManage(user)

          return (
            <li
              key={user.id}
              className={[
                'relative flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950',
                isDisabled ? 'opacity-60' : '',
              ].join(' ')}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                {initialsOf(user.name)}
              </span>

              <div className="min-w-40 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-100">
                  {user.name}
                  {isSelf && (
                    <span className="rounded-full bg-stone-100 px-1.5 text-[11px] font-normal text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      это вы
                    </span>
                  )}
                  {isInvited && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-1.5 text-[11px] font-normal text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      <Mail className="size-3" aria-hidden="true" />
                      {statusLabels.invited}
                    </span>
                  )}
                  {isDisabled && (
                    <span className="rounded-full bg-stone-100 px-1.5 text-[11px] font-normal text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      {statusLabels.disabled}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">{user.email}</p>
              </div>

              <span className="hidden w-24 shrink-0 text-xs tabular-nums text-stone-500 sm:block dark:text-stone-400">
                {user.status === 'active' ? dealsLabel(user.dealCount) : '—'}
              </span>

              <div className="w-full sm:w-52">
                {manageable && !isInvited ? (
                  <Select
                    value={user.role}
                    options={roleOptions}
                    onChange={(role) => onChangeUserRole?.(user.id, role as AssignableRole)}
                    ariaLabel={`Роль: ${user.name}`}
                  />
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-stone-500 dark:text-stone-400">
                    {user.role === 'owner' ? (
                      <Crown className="size-4 text-amber-500" aria-hidden="true" />
                    ) : (
                      <ShieldCheck className="size-4 text-stone-400" aria-hidden="true" />
                    )}
                    {roleLabel(user.role)}
                  </span>
                )}
              </div>

              {manageable && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuFor(menuFor === user.id ? null : user.id)}
                    aria-haspopup="menu"
                    aria-expanded={menuFor === user.id}
                    aria-label={`Действия: ${user.name}`}
                    className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
                  >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </button>
                  {menuFor === user.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} aria-hidden="true" />
                      <div
                        role="menu"
                        className="absolute top-full right-0 z-20 mt-1 w-56 rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-800 dark:bg-stone-900"
                      >
                        {isInvited && (
                          <>
                            <MenuItem icon={Mail} label="Новая ссылка приглашения" onClick={() => resend(user)} />
                            <MenuItem
                              icon={X}
                              label="Отменить приглашение"
                              tone="danger"
                              onClick={() => {
                                setMenuFor(null)
                                setPendingCancel(user)
                              }}
                            />
                          </>
                        )}
                        {user.status === 'active' && (
                          <>
                            <MenuItem icon={KeyRound} label="Ссылка для сброса пароля" onClick={() => resetLink(user)} />
                            {isOwner && (
                              <MenuItem
                                icon={Crown}
                                label="Передать владение"
                                onClick={() => {
                                  setMenuFor(null)
                                  setPendingTransfer(user)
                                }}
                              />
                            )}
                            <MenuItem
                              icon={UserMinus}
                              label="Отключить доступ"
                              tone="danger"
                              onClick={() => {
                                setMenuFor(null)
                                setPendingDisable(user)
                              }}
                            />
                          </>
                        )}
                        {isDisabled && (
                          <MenuItem
                            icon={UserPlus}
                            label="Вернуть доступ"
                            onClick={() => {
                              setMenuFor(null)
                              onEnableUser?.(user.id)
                            }}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {pendingDisable && (
        <ConfirmDialog
          title="Отключить доступ?"
          subject={pendingDisable.name}
          warning={
            pendingDisable.dealCount > 0
              ? `Сотрудник ведёт ${dealsLabel(pendingDisable.dealCount)}. Их стоит передать до отключения — история сохранится в любом случае.`
              : undefined
          }
          confirmLabel="Отключить"
          onConfirm={() => {
            onDisableUser?.(pendingDisable.id)
            setPendingDisable(null)
          }}
          onCancel={() => setPendingDisable(null)}
        />
      )}

      {pendingTransfer && (
        <ConfirmDialog
          title="Передать владение?"
          subject={pendingTransfer.name}
          warning="Вы останетесь админом, но сменить владельца дальше сможет только новый владелец."
          confirmLabel="Передать"
          onConfirm={() => {
            onTransferOwnership?.(pendingTransfer.id)
            setPendingTransfer(null)
          }}
          onCancel={() => setPendingTransfer(null)}
        />
      )}

      {pendingCancel && (
        <ConfirmDialog
          title="Отменить приглашение?"
          subject={pendingCancel.email}
          confirmLabel="Отменить приглашение"
          onConfirm={() => {
            onCancelInvite?.(pendingCancel.id)
            setPendingCancel(null)
          }}
          onCancel={() => setPendingCancel(null)}
        />
      )}

      {link && <LinkDialog state={link} onClose={() => setLink(null)} />}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  tone = 'default',
  onClick,
}: {
  icon: typeof Mail
  label: string
  tone?: 'default' | 'danger'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
        tone === 'danger'
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
          : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
      ].join(' ')}
    >
      <Icon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
      {label}
    </button>
  )
}
