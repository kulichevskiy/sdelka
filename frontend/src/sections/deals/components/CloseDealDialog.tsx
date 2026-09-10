import { useState } from 'react'
import { CircleSlash, Trophy, X } from 'lucide-react'
import type { DealOutcome } from '../types'
import { useDialogAppear, useFadeIn } from './transitions'

interface CloseDealDialogProps {
  dealTitle: string
  /** Причины из справочника — быстрый выбор, можно ввести и свою */
  lossReasons?: string[]
  onConfirm: (outcome: DealOutcome, lostReason?: string) => void
  onCancel: () => void
}

/** Выбор исхода при переносе сделки в закрывающую стадию */
export function CloseDealDialog({ dealTitle, lossReasons = [], onConfirm, onCancel }: CloseDealDialogProps) {
  const [outcome, setOutcome] = useState<DealOutcome | null>(null)
  const [lostReason, setLostReason] = useState('')
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
        aria-label="Закрытие сделки"
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

        <h2 className="pr-6 text-base font-semibold text-stone-900 dark:text-stone-100">
          Чем закончилась сделка?
        </h2>
        <p className="mt-1 truncate text-sm text-stone-500 dark:text-stone-400">{dealTitle}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOutcome('won')}
            className={[
              'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors',
              outcome === 'won'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'border-stone-200 text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:text-stone-400',
            ].join(' ')}
          >
            <Trophy className="size-5" aria-hidden="true" />
            Выиграно
          </button>
          <button
            type="button"
            onClick={() => setOutcome('lost')}
            className={[
              'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors',
              outcome === 'lost'
                ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'border-stone-200 text-stone-600 hover:border-stone-300 dark:border-stone-800 dark:text-stone-400',
            ].join(' ')}
          >
            <CircleSlash className="size-5" aria-hidden="true" />
            Проиграно
          </button>
        </div>

        {outcome === 'lost' && (
          <label className="mt-3 block">
            <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
              Причина проигрыша
            </span>
            <input
              autoFocus
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              placeholder="Например: выбрали конкурента"
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
            {lossReasons.length > 0 && (
              <span className="mt-2 flex flex-wrap gap-1">
                {lossReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setLostReason(reason)}
                    className={[
                      'rounded-md border px-2 py-0.5 text-xs transition-colors',
                      lostReason === reason
                        ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-400 dark:bg-brand-500 dark:text-white'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800',
                    ].join(' ')}
                  >
                    {reason}
                  </button>
                ))}
              </span>
            )}
          </label>
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
            disabled={!outcome || (outcome === 'lost' && !lostReason.trim())}
            onClick={() => outcome && onConfirm(outcome, lostReason.trim() || undefined)}
            className="rounded-lg bg-brand-600 dark:bg-brand-500 dark:text-white px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 dark:hover:bg-brand-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            Закрыть сделку
          </button>
        </div>
      </div>
    </div>
  )
}
