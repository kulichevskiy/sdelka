import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthMutations } from '@/api/queries'
import { Alert, Button, Field } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthMutations()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const from = (location.state as { from?: string } | null)?.from ?? '/today'

  function submit(event: FormEvent) {
    event.preventDefault()
    login.mutate({ email: email.trim(), password }, { onSuccess: () => navigate(from, { replace: true }) })
  }

  return (
    <AuthLayout
      title="Вход"
      subtitle="Рабочий стол, сделки и контакты вашей команды"
      footer={
        <>
          Ещё нет аккаунта?{' '}
          <Link to="/register" className="font-medium text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label="Почта"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          label="Пароль"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {login.error && <Alert>{login.error.message}</Alert>}
        <Button type="submit" loading={login.isPending} className="mt-1 w-full">
          Войти
        </Button>
        <Link
          to="/forgot-password"
          className="text-center text-xs text-stone-500 underline-offset-2 hover:underline dark:text-stone-400"
        >
          Забыли пароль?
        </Link>
      </form>
    </AuthLayout>
  )
}
