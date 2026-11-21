import { useAuthMutations } from '@/api/queries'
import { Alert, Button } from '@/components/ui'

/** Кнопка «выслать письмо ещё раз» для неподтверждённой почты */
export function ResendVerification({ email }: { email: string }) {
  const { resendVerification } = useAuthMutations()

  if (resendVerification.isSuccess) {
    return <Alert tone="success">Отправили письмо ещё раз. Если его нет, проверьте папку «Спам».</Alert>
  }
  return (
    <>
      {resendVerification.error && <Alert>{resendVerification.error.message}</Alert>}
      <Button
        variant="secondary"
        className="w-full"
        loading={resendVerification.isPending}
        onClick={() => resendVerification.mutate({ email })}
      >
        Выслать письмо ещё раз
      </Button>
    </>
  )
}
