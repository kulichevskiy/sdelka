import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuthMutations } from '@/api/queries'
import type { Currency, PipelineTemplate } from '@/api/types'
import { Alert, Button, Field, labelClass } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

const currencies: Array<{ value: Currency; label: string; hint: string }> = [
  { value: 'RUB', label: '₽', hint: 'Рубли' },
  { value: 'USD', label: '$', hint: 'Доллары' },
  { value: 'EUR', label: '€', hint: 'Евро' },
]

const templates: Array<{ value: PipelineTemplate; label: string; hint: string; stages: string[] }> = [
  {
    value: 'standard',
    label: 'Стандартная воронка',
    hint: 'Подходит большинству команд, стадии можно переименовать позже',
    stages: ['Новая заявка', 'Квалификация', 'Предложение', 'Переговоры', 'Закрыто'],
  },
  {
    value: 'empty',
    label: 'Начну с пустой',
    hint: 'Только стадия «Закрыто», остальные добавите сами',
    stages: ['Закрыто'],
  },
]

/** Два шага: аккаунт → организация. Всё отправляется одним запросом на втором шаге */
export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuthMutations()
  const [step, setStep] = useState<1 | 2>(1)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [currency, setCurrency] = useState<Currency>('RUB')
  const [template, setTemplate] = useState<PipelineTemplate>('standard')

  const passwordError = password.length > 0 && password.length < 8 ? 'Минимум 8 символов' : undefined

  function next(event: FormEvent) {
    event.preventDefault()
    if (passwordError) return
    setStep(2)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    register.mutate(
      { name: name.trim(), email: email.trim(), password, orgName: orgName.trim(), currency, pipelineTemplate: template },
      { onSuccess: () => navigate('/deals', { replace: true }) },
    )
  }

  const steps = (
    <span className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
      <span className={step === 1 ? 'font-semibold text-stone-900 dark:text-stone-100' : ''}>1. Аккаунт</span>
      <span>→</span>
      <span className={step === 2 ? 'font-semibold text-stone-900 dark:text-stone-100' : ''}>2. Организация</span>
    </span>
  )

  return (
    <AuthLayout
      width={step === 2 ? 'lg' : 'sm'}
      title={step === 1 ? 'Создать аккаунт' : 'Ваша организация'}
      subtitle={steps}
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">
            Войти
          </Link>
        </>
      }
    >
      {step === 1 ? (
        <form onSubmit={next} className="flex flex-col gap-3">
          <Field label="Имя" autoComplete="name" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Анна Соколова" />
          <Field label="Почта" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field
            label="Пароль"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordError}
            hint="Не короче 8 символов"
          />
          <Button type="submit" className="mt-1 w-full" disabled={!name.trim() || !email.trim() || password.length < 8}>
            Дальше
          </Button>
        </form>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Название организации" autoFocus required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Например, «Север Продажи»" hint="Так команда увидит вас в приглашениях" />

          <div>
            <span className={labelClass}>Валюта сделок</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {currencies.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCurrency(item.value)}
                  aria-pressed={currency === item.value}
                  className={[
                    'rounded-lg border px-3 py-2 text-left transition-colors',
                    currency === item.value
                      ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                      : 'border-stone-200 text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-900',
                  ].join(' ')}
                >
                  <span className="block text-base font-semibold">{item.label}</span>
                  <span className="block text-xs opacity-70">{item.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelClass}>Воронка продаж</span>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {templates.map((item) => {
                const active = template === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTemplate(item.value)}
                    aria-pressed={active}
                    className={[
                      'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                      active
                        ? 'border-stone-900 dark:border-stone-100'
                        : 'border-stone-200 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                        active ? 'border-stone-900 bg-stone-900 dark:border-stone-100 dark:bg-stone-100' : 'border-stone-300 dark:border-stone-700',
                      ].join(' ')}
                    >
                      {active && <Check className="size-3 text-white dark:text-stone-900" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-stone-500 dark:text-stone-400">{item.hint}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {item.stages.map((stage) => (
                          <span key={stage} className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                            {stage}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {register.error && <Alert>{register.error.message}</Alert>}

          <div className="flex gap-2 sm:justify-end">
            <Button variant="secondary" onClick={() => setStep(1)} className="shrink-0">
              Назад
            </Button>
            <Button type="submit" loading={register.isPending} className="flex-1 sm:flex-none sm:px-6" disabled={!orgName.trim()}>
              Создать организацию
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
