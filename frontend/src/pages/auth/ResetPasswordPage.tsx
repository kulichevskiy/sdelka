import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuthMutations } from '@/api/queries'
import { Alert, Button, Field, FullScreenLoader } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

export function ResetPasswordPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { resetPassword } = useAuthMutations()
  const [password, setPassword] = useState('')

  const check = useQuery<{ email: string }>({
    queryKey: ['reset', token],
    queryFn: () => api.get(`/auth/reset/${token}`),
    retry: false,
  })

  if (check.isPending) return <FullScreenLoader />

  const toLogin = (
    <Link to="/login" className="font-medium text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">
      Ко входу
    </Link>
  )

  if (check.error || !check.data) {
    return (
      <AuthLayout title="Ссылка недействительна" subtitle="Ссылка для сброса живёт два часа и работает один раз." footer={toLogin}>
        <Alert>{check.error?.message ?? 'Не удалось проверить ссылку'}</Alert>
      </AuthLayout>
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    resetPassword.mutate({ token, password }, { onSuccess: () => navigate('/login', { replace: true }) })
  }

  return (
    <AuthLayout title="Новый пароль" subtitle={`Для аккаунта ${check.data.email}`} footer={toLogin}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Пароль" type="password" autoFocus required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Не короче 8 символов" />
        {resetPassword.error && <Alert>{resetPassword.error.message}</Alert>}
        <Button type="submit" loading={resetPassword.isPending} className="mt-1 w-full" disabled={password.length < 8}>
          Сохранить и войти
        </Button>
      </form>
    </AuthLayout>
  )
}
