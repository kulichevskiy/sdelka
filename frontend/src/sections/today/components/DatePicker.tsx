import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  /** ISO-дата (YYYY-MM-DD) */
  value: string
  onChange: (isoDate: string) => void
  /** Сегодняшняя дата (YYYY-MM-DD): подсвечивается в сетке и питает быстрые кнопки */
  today: string
  ariaLabel: string
  className?: string
  /** Компактный вид для строк списка */
  size?: 'sm' | 'md'
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Размеры поповера: по ним решаем, раскрывать вверх или вниз */
const POPOVER_WIDTH = 256
const POPOVER_HEIGHT = 306

const monthTitle = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const triggerFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`)
}

/** Собираем ISO из локальных частей: toISOString() уводит дату на день назад восточнее UTC */
function toIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(isoDate: string, days: number): string {
  const date = toDate(isoDate)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

function addMonths(isoDate: string, months: number): string {
  const date = toDate(isoDate)
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  return toIso(date)
}

/** Понедельник — первый день недели */
function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function buildGrid(monthAnchorIso: string): string[] {
  const anchor = toDate(monthAnchorIso)
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - weekdayIndex(first))

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return toIso(day)
  })
}

/**
 * Календарь вместо нативного <input type="date">: одинаковый во всех браузерах,
 * с русскими подписями, неделей с понедельника и быстрыми вариантами переноса.
 *
 * Поповер рендерится в портал: строки списков обрезаны overflow-hidden ради
 * анимации сворачивания, и внутри контейнера календарь был бы срезан.
 *
 * Клавиатура: стрелки — по дням и неделям, PageUp/PageDown — по месяцам,
 * Enter — выбрать, Escape — закрыть.
 */
export function DatePicker({
  value,
  onChange,
  today,
  ariaLabel,
  className = '',
  size = 'md',
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [monthAnchor, setMonthAnchor] = useState(value)
  const [focusedDate, setFocusedDate] = useState(value)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const grid = useMemo(() => buildGrid(monthAnchor), [monthAnchor])
  const anchorMonth = toDate(monthAnchor).getMonth()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    // При прокрутке поповер закрываем, иначе он «отклеится» от кнопки
    function onViewportChange() {
      setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('scroll', onViewportChange, true)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [open])

  function openCalendar() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const flipUp = rect.bottom + POPOVER_HEIGHT > window.innerHeight
      setPosition({
        top: flipUp ? Math.max(8, rect.top - POPOVER_HEIGHT - 4) : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8)),
      })
    }
    setMonthAnchor(value)
    setFocusedDate(value)
    setOpen(true)
  }

  function commit(isoDate: string) {
    onChange(isoDate)
    setOpen(false)
  }

  function moveFocus(days: number) {
    const next = addDays(focusedDate, days)
    setFocusedDate(next)
    if (toDate(next).getMonth() !== anchorMonth) setMonthAnchor(next)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        openCalendar()
      }
      return
    }

    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }

    if (event.key in steps) {
      event.preventDefault()
      moveFocus(steps[event.key])
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      const next = addMonths(focusedDate, event.key === 'PageUp' ? -1 : 1)
      setFocusedDate(next)
      setMonthAnchor(next)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      commit(focusedDate)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const shortcuts = [
    { label: 'Сегодня', date: today },
    { label: 'Завтра', date: addDays(today, 1) },
    { label: '+7 дней', date: addDays(today, 7) },
  ]

  const triggerSize = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1.5 text-sm'

  const popover = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
      className="fixed z-50 rounded-xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          onClick={() => setMonthAnchor(addMonths(monthAnchor, -1))}
          aria-label="Предыдущий месяц"
          className="rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="text-sm font-semibold text-stone-900 first-letter:uppercase dark:text-stone-100">
          {monthTitle.format(toDate(monthAnchor))}
        </span>
        <button
          type="button"
          onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))}
          aria-label="Следующий месяц"
          className="rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((weekday) => (
          <span
            key={weekday}
            className="py-1 text-center text-[10px] font-semibold tracking-wide text-stone-400 uppercase dark:text-stone-600"
          >
            {weekday}
          </span>
        ))}

        {grid.map((isoDate) => {
          const date = toDate(isoDate)
          const isCurrentMonth = date.getMonth() === anchorMonth
          const isSelected = isoDate === value
          const isToday = isoDate === today
          const isFocused = isoDate === focusedDate

          return (
            <button
              key={isoDate}
              type="button"
              onClick={() => commit(isoDate)}
              onMouseEnter={() => setFocusedDate(isoDate)}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              className={[
                'aspect-square rounded-md text-xs tabular-nums transition-colors',
                isSelected
                  ? 'bg-stone-900 dark:bg-stone-100 dark:text-stone-900 font-semibold text-white'
                  : isFocused
                    ? 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                    : isCurrentMonth
                      ? 'text-stone-700 dark:text-stone-300'
                      : 'text-stone-300 dark:text-stone-700',
                !isSelected && isToday ? 'font-semibold text-stone-900 dark:text-stone-200' : '',
              ].join(' ')}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex gap-1 border-t border-stone-100 pt-2 dark:border-stone-800">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            onClick={() => commit(shortcut.date)}
            className="flex-1 rounded-md px-1 py-1 text-[11px] text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            {shortcut.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openCalendar())}
        onKeyDown={onKeyDown}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={[
          'flex w-full items-center gap-1.5 rounded-lg border bg-white text-left tabular-nums transition-colors',
          'focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:bg-stone-950',
          triggerSize,
          open
            ? 'border-stone-500 dark:border-stone-600'
            : 'border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700',
        ].join(' ')}
      >
        <CalendarDays className="size-3.5 shrink-0 text-stone-400" aria-hidden="true" />
        <span className="flex-1 truncate text-stone-900 dark:text-stone-100">
          {triggerFormat.format(toDate(value))}
        </span>
      </button>

      {open && createPortal(popover, document.body)}
    </div>
  )
}
