import { useCallback } from 'react'

/**
 * Ref-колбэки для появления панелей и диалогов.
 *
 * Анимация запускается через Web Animations API, а не сменой инлайновых стилей:
 * базовое состояние элемента остаётся видимым, поэтому если анимация не проиграет
 * (неактивная вкладка, отключённая анимация, старый движок) — контент всё равно на месте.
 * Файл продублирован в каждой секции намеренно: секции экспортируются независимо.
 */
function useAppear(from: string, durationMs: number, easing: string) {
  return useCallback(
    (node: HTMLElement | null) => {
      if (!node || typeof node.animate !== 'function') return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      node.animate(
        [
          { opacity: 0, transform: from },
          { opacity: 1, transform: 'none' },
        ],
        { duration: durationMs, easing },
      )
    },
    [from, durationMs, easing],
  )
}

/** Боковая панель выезжает справа */
export function useSlideInFromRight() {
  return useAppear('translateX(24px)', 260, 'cubic-bezier(0.32, 0.72, 0, 1)')
}

/** Диалог появляется по центру с лёгким приближением */
export function useDialogAppear() {
  return useAppear('scale(0.97)', 180, 'ease-out')
}

/** Затемнение фона проявляется без сдвига */
export function useFadeIn() {
  return useAppear('none', 200, 'ease-out')
}
