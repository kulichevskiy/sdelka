import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler } from '@/api/client'
import { keys, useMe } from '@/api/queries'
import { FullScreenLoader } from '@/components/ui'
import { AppLayout } from '@/routes/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { InvitePage } from '@/pages/auth/InvitePage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { TodayPage } from '@/pages/TodayPage'
import { DealsPage } from '@/pages/DealsPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { AdminPage } from '@/pages/AdminPage'
import { SettingsPage } from '@/pages/SettingsPage'

/** Гостевые страницы: залогиненного уводим в приложение */
function GuestOnly() {
  const me = useMe()
  if (me.isPending) return <FullScreenLoader />
  if (me.data) return <Navigate to="/deals" replace />
  return <Outlet />
}

/** Защищённые страницы: без сессии — на вход, с возвратом туда, куда шли */
function RequireAuth() {
  const me = useMe()
  const location = useLocation()
  if (me.isPending) return <FullScreenLoader />
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <AppLayout me={me.data} />
}

export function App() {
  const navigate = useNavigate()
  const client = useQueryClient()

  // 401 посреди работы (сессия истекла, доступ отключили) — сбрасываем кэш и уходим на вход
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (client.getQueryData(keys.me)) {
        client.clear()
        navigate('/login', { replace: true })
      }
    })
    return () => setUnauthorizedHandler(null)
  }, [client, navigate])

  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Инвайт и сброс доступны и залогиненным: человек мог сидеть под другим аккаунтом */}
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/reset/:token" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/today" element={<TodayPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
