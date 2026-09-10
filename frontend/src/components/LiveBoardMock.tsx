import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

/**
 * Живой макет канбана для лендинга: карточки сами переезжают по стадиям,
 * дошедшие до конца растворяются, а в первую колонку приходят новые.
 *
 * Карточки позиционированы абсолютно по (колонка, строка) и анимируются через
 * transition на left/top — так переезд между колонками плавный без FLIP-измерений.
 * При prefers-reduced-motion анимация не запускается, доска остаётся статичной.
 */

const COLUMNS = 4
const MAX_ROWS = 3
const CARD_H = 56
const GAP = 6
const HEADER_H = 18
const TICK_MS = 1100

type Phase = 'enter' | 'idle' | 'exit'
interface Card {
  id: number
  col: number
  overdue: boolean
  phase: Phase
}

let nextId = 100
const initial: Card[] = [
  { id: 1, col: 0, overdue: false, phase: 'idle' },
  { id: 2, col: 0, overdue: true, phase: 'idle' },
  { id: 3, col: 1, overdue: false, phase: 'idle' },
  { id: 4, col: 1, overdue: false, phase: 'idle' },
  { id: 5, col: 2, overdue: true, phase: 'idle' },
  { id: 6, col: 3, overdue: false, phase: 'idle' },
  { id: 7, col: 3, overdue: false, phase: 'idle' },
]

/** Один шаг сценария: продвинуть случайную карточку или выпустить новую */
function step(cards: Card[]): Card[] {
  const live = cards.filter((c) => c.phase !== 'exit')
  const perCol = (col: number) => live.filter((c) => c.col === col).length

  // Последняя колонка переполнилась — самая старая закрытая сделка уходит из доски
  if (perCol(COLUMNS - 1) >= MAX_ROWS) {
    const leaving = live.find((c) => c.col === COLUMNS - 1)!
    return cards.map((c) => (c.id === leaving.id ? { ...c, phase: 'exit' } : c))
  }

  // Первая колонка пустеет — приходит новая заявка
  if (perCol(0) === 0 || (perCol(0) < 2 && Math.random() < 0.5)) {
    return [...cards, { id: nextId++, col: 0, overdue: Math.random() < 0.3, phase: 'enter' }]
  }

  // Иначе двигаем случайную карточку вправо, туда, где есть место
  const movable = live.filter((c) => c.col < COLUMNS - 1 && perCol(c.col + 1) < MAX_ROWS)
  if (!movable.length) return cards
  const pick = movable[Math.floor(Math.random() * movable.length)]
  // Сделка с просрочкой, дойдя до следующей стадии, «оживает»
  return cards.map((c) => (c.id === pick.id ? { ...c, col: c.col + 1, overdue: c.overdue && Math.random() < 0.4 } : c))
}

export function LiveBoardMock() {
  const [cards, setCards] = useState<Card[]>(initial)
  const reduceMotion = useRef(false)

  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion.current) return

    const timer = window.setInterval(() => {
      setCards((current) => step(current))
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  // Появившиеся карточки через кадр становятся обычными, ушедшие — удаляются после анимации
  useEffect(() => {
    if (cards.some((c) => c.phase === 'enter')) {
      const raf = requestAnimationFrame(() =>
        setCards((current) => current.map((c) => (c.phase === 'enter' ? { ...c, phase: 'idle' } : c))),
      )
      return () => cancelAnimationFrame(raf)
    }
    if (cards.some((c) => c.phase === 'exit')) {
      const timer = window.setTimeout(() => setCards((current) => current.filter((c) => c.phase !== 'exit')), 450)
      return () => window.clearTimeout(timer)
    }
  }, [cards])

  // Строка карточки = её порядок среди живых карточек колонки
  const rowOf = new Map<number, number>()
  for (let col = 0; col < COLUMNS; col++) {
    cards.filter((c) => c.col === col && c.phase !== 'exit').forEach((c, i) => rowOf.set(c.id, i))
  }
  const counts = Array.from({ length: COLUMNS }, (_, col) => cards.filter((c) => c.col === col && c.phase !== 'exit').length)
  const boardH = HEADER_H + MAX_ROWS * (CARD_H + GAP)

  return (
    <div className="relative" style={{ height: boardH }}>
      {/* Колонки — статичная подложка */}
      <div className="absolute inset-0 grid gap-2" style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}>
        {counts.map((count, index) => (
          <div key={index} className="rounded-lg bg-stone-100/80 p-1.5 dark:bg-stone-900/60">
            <div className="flex items-center justify-between px-0.5">
              <span className="block h-1.5 w-10 rounded-full bg-stone-400 dark:bg-stone-500" />
              <span className="text-[9px] tabular-nums text-stone-400 transition-colors">{count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Карточки — поверх, каждая знает свою колонку и строку */}
      {cards.map((card) => {
        const row = rowOf.get(card.id) ?? 0
        const isLast = card.col === COLUMNS - 1
        const hidden = card.phase !== 'idle'
        return (
          <div
            key={card.id}
            className={[
              'absolute rounded-md border bg-white p-2 dark:bg-stone-900',
              'transition-[left,top,opacity,transform,border-color] duration-[500ms] ease-[cubic-bezier(.22,1,.36,1)]',
              card.overdue && !isLast ? 'border-red-200 dark:border-red-900' : 'border-stone-200 dark:border-stone-800',
              isLast ? 'opacity-60' : '',
            ].join(' ')}
            style={{
              // Ширина колонки: (100% - зазоры) / COLUMNS, плюс внутренний отступ 6px
              width: `calc((100% - ${(COLUMNS - 1) * 8}px) / ${COLUMNS} - 12px)`,
              left: `calc((100% - ${(COLUMNS - 1) * 8}px) / ${COLUMNS} * ${card.col} + ${card.col * 8 + 6}px)`,
              top: HEADER_H + 6 + row * (CARD_H + GAP),
              height: CARD_H,
              opacity: hidden ? 0 : undefined,
              transform: card.phase === 'enter' ? 'translateY(-10px) scale(.92)' : card.phase === 'exit' ? 'scale(.85)' : undefined,
              transitionDuration: card.phase === 'exit' ? '420ms' : undefined,
            }}
          >
            <span className="block h-1.5 w-3/4 rounded-full bg-stone-800 dark:bg-stone-200" />
            <span className="mt-1.5 block h-1.5 w-1/2 rounded-full bg-stone-200 dark:bg-stone-700" />
            <div className="mt-2 flex items-center justify-between">
              <span
                className={[
                  'block h-1.5 w-10 rounded-full transition-colors duration-500',
                  card.overdue && !isLast ? 'bg-red-300 dark:bg-red-800' : 'bg-stone-300 dark:bg-stone-600',
                ].join(' ')}
              />
              {isLast ? (
                <span className="flex size-3.5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
                  <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : (
                <span className="size-3.5 rounded-full bg-stone-200 dark:bg-stone-700" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
