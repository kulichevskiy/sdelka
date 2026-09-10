/**
 * Примитивы для страниц вне продукта (auth, лендинг, настройки).
 * Внутри разделов свои стили из наброска, здесь — та же stone-палитра.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export const FONT = 'Graphik, system-ui, sans-serif'

export const inputClass =
  'mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100'

export const labelClass =
  'text-[11px] font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export function Field({ label, hint, error, className = '', ...props }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      <input
        {...props}
        className={`${inputClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-stone-400 dark:text-stone-500">{hint}</span>
      ) : null}
    </label>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400',
  secondary:
    'border border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800',
  ghost: 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800',
  danger:
    'border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
}

export function Button({
  variant = 'primary',
  loading,
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  const tones = {
    error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
    info: 'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}

/** Полноэкранный спиннер на время первой загрузки сессии */
export function FullScreenLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-900"
      style={{ fontFamily: FONT }}
    >
      <Loader2 className="size-6 animate-spin text-stone-400" aria-label="Загрузка" />
    </div>
  )
}

/** Логотип продукта: квадрат с буквой и название */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-9 text-base' : size === 'sm' ? 'size-6 text-[11px]' : 'size-7 text-xs'
  const text = size === 'lg' ? 'text-lg' : 'text-sm'
  return (
    <span className="inline-flex items-center gap-2" style={{ fontFamily: FONT }}>
      <span
        className={`flex ${box} items-center justify-center rounded-md bg-brand-600 font-bold text-white dark:bg-brand-500 dark:text-white`}
      >
        S
      </span>
      <span className={`${text} font-bold tracking-tight text-stone-900 dark:text-stone-100`}>Sales HQ</span>
    </span>
  )
}
