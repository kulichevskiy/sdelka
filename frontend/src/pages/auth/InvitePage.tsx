import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuthMutations } from '@/api/queries'
import type { InviteInfo } from '@/api/types'
import { roleLabel } from '@/lib/roles'
import { Alert, Button, Field, FullScreenLoader } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

export function InvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { acceptInvite } = useAuthMutations()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const invite = useQuery<InviteInfo>({
    queryKey: ['invite', token],
    queryFn: () => api.get<InviteInfo>(`/auth/invite/${token}`),
    retry: false,
  })

  if (invite.isPending) return <FullScreenLoader />

  if (invite.error || !invite.data) {
    return (
      <AuthLayout
        title="Приглашение недействительно"
        subtitle="Ссылка устарела или уже использована. Попросите администратора отправить новую."
        footer={
          <Link to="/login" className="font-medium text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">
            Ко входу
          </Link>
        }
      >
        <Alert>{invite.error?.message ?? 'Не удалось открыть приглашение'}</Alert>
      </AuthLayout>
    )
  }

  const info = invite.data

  function submit(event: FormEvent) {
    event.preventDefault()
    acceptInvite.mutate({ token, name: name.trim(), password }, { onSuccess: () => navigate('/deals', { replace: true }) })
  }

  return (
    <AuthLayout
      title={`Вас приглашают в «${info.orgName}»`}
      subtitle={
        <>
          {info.inviterName} добавляет вас как <span className="font-medium">{roleLabel(info.role).toLowerCase()}</span>. Осталось придумать пароль.
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Почта" value={info.email} readOnly className="opacity-70" />
        <Field label="Ваше имя" autoFocus required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Пароль" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Не короче 8 символов" />
        {acceptInvite.error && <Alert>{acceptInvite.error.message}</Alert>}
        <Button type="submit" loading={acceptInvite.isPending} className="mt-1 w-full" disabled={!name.trim() || password.length < 8}>
          Присоединиться
        </Button>
      </form>
    </AuthLayout>
  )
}
