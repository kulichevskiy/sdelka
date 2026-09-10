import { useState, type FormEvent } from 'react'
import { Moon, Sun, SunMoon } from 'lucide-react'
import { useAuthMutations } from '@/api/queries'
import { Alert, Button, Field, labelClass } from '@/components/ui'
import { roleLabel } from '@/lib/roles'
import { themeLabels, useTheme, type Theme } from '@/lib/theme'
import { useSession } from '@/routes/AppLayout'

const themeIcons = { light: Sun, dark: Moon, system: SunMoon }

export function SettingsPage() {
  const { me } = useSession()
  const { theme, setTheme } = useTheme()
  const { updateProfile, changePassword } = useAuthMutations()

  const [name, setName] = useState(me.user.name)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  function saveProfile(event: FormEvent) {
    event.preventDefault()
    if (name.trim() && name.trim() !== me.user.name) updateProfile.mutate({ name: name.trim() })
  }

  function savePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordSaved(false)
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('')
          setNext('')
          setPasswordSaved(true)
        },
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Настройки</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {me.user.email} · {roleLabel(me.user.role)} в «{me.org.name}»
      </p>

      <form onSubmit={saveProfile} className="mt-6 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Профиль</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Имя" value={name} onChange={(event) => setName(event.target.value)} className="flex-1" />
          <Button type="submit" loading={updateProfile.isPending} disabled={!name.trim() || name.trim() === me.user.name}>
            Сохранить
          </Button>
        </div>
        {updateProfile.error && <div className="mt-3"><Alert>{updateProfile.error.message}</Alert></div>}
      </form>

      <form onSubmit={savePassword} className="mt-4 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Смена пароля</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Текущий пароль" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
          <Field label="Новый пароль" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(event) => setNext(event.target.value)} hint="Не короче 8 символов" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button type="submit" loading={changePassword.isPending} disabled={!current || next.length < 8}>
            Сменить пароль
          </Button>
          {passwordSaved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Пароль обновлён</span>}
        </div>
        {changePassword.error && <div className="mt-3"><Alert>{changePassword.error.message}</Alert></div>}
      </form>

      <section className="mt-4 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Тема</h2>
        <span className={`${labelClass} mt-3 block`}>Оформление интерфейса</span>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {(Object.keys(themeLabels) as Theme[]).map((value) => {
            const Icon = themeIcons[value]
            const active = theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={active}
                className={[
                  'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors',
                  active
                    ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-900',
                ].join(' ')}
              >
                <Icon className="size-5" aria-hidden="true" />
                {themeLabels[value]}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
