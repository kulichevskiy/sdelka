import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthMutations } from '@/api/queries'
import { Alert, Button, Field } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuthMutations()
  const [email, setEmail] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    forgotPassword.mutate({ email: email.trim() })
  }

  return (
    <AuthLayout
      title="Восстановление пароля"
      subtitle="Если почта настроена, пришлём ссылку для сброса. Если нет — ссылку выдаст администратор вашей организации."
      footer={
        <Link to="/login" className="font-medium text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">
          Вернуться ко входу
        </Link>
      }
    >
      {forgotPassword.isSuccess ? (
        <Alert tone="success">
          Если аккаунт с такой почтой есть и почта настроена, письмо уже в пути. Иначе попросите администратора сделать ссылку для сброса в разделе «Пользователи».
        </Alert>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Почта" type="email" autoFocus required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {forgotPassword.error && <Alert>{forgotPassword.error.message}</Alert>}
          <Button type="submit" loading={forgotPassword.isPending} className="mt-1 w-full">
            Отправить ссылку
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
