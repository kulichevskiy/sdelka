import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FONT, Logo } from '@/components/ui'

interface AuthLayoutProps {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** Одна колонка по центру: карточка формы и ссылки под ней */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div
      className="flex min-h-screen flex-col bg-stone-50 px-4 py-8 text-stone-900 dark:bg-stone-900 dark:text-stone-100"
      style={{ fontFamily: FONT }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <Link to="/" className="mb-6 self-start" aria-label="На главную">
          <Logo />
        </Link>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <p className="mt-4 text-center text-sm text-stone-500 dark:text-stone-400">{footer}</p>}
      </div>
    </div>
  )
}
