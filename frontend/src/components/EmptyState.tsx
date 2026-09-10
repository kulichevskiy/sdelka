import type { ReactNode } from 'react'

interface EmptyStateProps {
  illustration: ReactNode
  title: string
  description: string
  /** Главное действие — одно, чтобы не размывать внимание */
  action?: ReactNode
  /** Второстепенное: демо-данные, ссылка в помощь */
  secondary?: ReactNode
  className?: string
}

export function EmptyState({ illustration, title, description, action, secondary, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-1 flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <div className="text-stone-300 dark:text-stone-700">{illustration}</div>
      <h2 className="mt-5 text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">{description}</p>
      {(action || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  )
}
