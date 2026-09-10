import { AlertTriangle, X } from 'lucide-react'
import { useDialogAppear, useFadeIn } from './transitions'

interface ConfirmDialogProps {
  title: string
  /** Что именно удаляется — показывается отдельной строкой, чтобы не удалить лишнее */
  subject: string
  /** Предупреждение о последствиях, если они есть */
  warning?: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  subject,
  warning,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const backdropRef = useFadeIn()
  const dialogRef = useDialogAppear()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-stone-900/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(event) => event.key === 'Escape' && onCancel()}
        className="relative w-full max-w-sm rounded-xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-950"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Отмена"
          className="absolute top-3 right-3 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <h2 className="pr-6 text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
        <p className="mt-1 text-sm font-medium text-stone-700 dark:text-stone-300">{subject}</p>

        {warning && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
            {warning}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-red-700 active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
