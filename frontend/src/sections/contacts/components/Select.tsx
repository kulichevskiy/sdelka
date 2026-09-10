import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  /** Второстепенная строка под названием — должность, роль */
  hint?: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /** Доступное имя поля; видимую подпись рисует вызывающий код */
  ariaLabel: string
  placeholder?: string
  className?: string
  /** Компактный вид для панелей фильтров */
  size?: 'sm' | 'md'
}

/**
 * Выпадающий список вместо нативного <select>: одинаково выглядит во всех
 * браузерах и поддерживает подписи в две строки. Клавиатура: стрелки, Home/End,
 * Enter/Пробел — выбор, Escape — закрытие.
 */
export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Не выбрано',
  className = '',
  size = 'md',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listboxId = useId()

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex === -1 ? undefined : options[selectedIndex]

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  /** Открывая список, подсвечиваем текущее значение — с него начинается навигация */
  function openList() {
    setActiveIndex(selectedIndex === -1 ? 0 : selectedIndex)
    setOpen(true)
  }

  function commit(index: number) {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
      event.preventDefault()
      openList()
      return
    }
    if (!open) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      commit(activeIndex)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const triggerSize = size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-2.5 py-1.5 text-sm'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={[
          'flex w-full items-center gap-2 rounded-lg border bg-white text-left transition-colors',
          'focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:bg-stone-950',
          triggerSize,
          open
            ? 'border-stone-500 dark:border-stone-600'
            : 'border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700',
        ].join(' ')}
      >
        <span
          className={[
            'min-w-0 flex-1 truncate',
            selected ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400',
          ].join(' ')}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={[
            'size-4 shrink-0 text-stone-400 transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1 max-h-64 w-full min-w-max overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-800 dark:bg-stone-900"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === activeIndex
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
                className={[
                  'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive ? 'bg-stone-100 dark:bg-stone-800' : '',
                  isSelected
                    ? 'font-medium text-stone-900 dark:text-stone-100'
                    : 'text-stone-700 dark:text-stone-300',
                ].join(' ')}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.hint && (
                    <span className="block truncate text-xs text-stone-400 dark:text-stone-500">
                      {option.hint}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check className="size-4 shrink-0 text-stone-900 dark:text-stone-200" aria-hidden="true" />
                )}
              </li>
            )
          })}

          {options.length === 0 && (
            <li className="px-2.5 py-2 text-sm text-stone-400">Нет вариантов</li>
          )}
        </ul>
      )}
    </div>
  )
}
