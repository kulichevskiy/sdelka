import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { keys } from '@/api/queries'
import type { Me } from '@/api/types'
import { Alert, FullScreenLoader } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

/** Переход по ссылке из письма: подтверждает почту и сразу открывает приложение */
export function VerifyEmailPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()

  // Запрос, а не мутация в эффекте: ссылка одноразовая, а StrictMode запускает эффекты дважды
  const verify = useQuery<Me>({
    queryKey: ['verify-email', token],
    queryFn: () => api.post<Me>('/auth/verify-email', { token }),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!verify.data) return
    // Ссылку могли открыть под другим аккаунтом: его данные из кэша убираем
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'verify-email' })
    client.setQueryData(keys.me, verify.data)
    navigate('/deals', { replace: true })
  }, [verify.data, client, navigate])

  if (!verify.error) return <FullScreenLoader />

  return (
    <AuthLayout
      title="Ссылка недействительна"
      subtitle="Ссылка из письма живёт 48 часов и работает один раз. Если почта уже подтверждена, просто войдите."
      footer={
        <Link to="/login" className="font-medium text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">
          Ко входу
        </Link>
      }
    >
      <Alert>{verify.error.message}</Alert>
    </AuthLayout>
  )
}
