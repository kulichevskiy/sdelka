import { useCallback } from 'react'

/** Длительность ухода строки: столько ждём перед тем, как отдать действие наружу */
export const EXIT_MS = 200

/**
 * Ref-колбэк, проявляющий элемент при появлении в списке.
 *
 * Анимация запускается через Web Animations API, а не сменой инлайновых стилей:
 * базовое состояние элемента остаётся видимым, поэтому если анимация не проиграет
 * (неактивная вкладка, отключённая анимация, старый движок) — контент всё равно на месте.
 */
export function useEnterTransition(delayMs = 0) {
  return useCallback(
    (node: HTMLElement | null) => {
      if (!node || typeof node.animate !== 'function') return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      node.animate(
        [
          { opacity: 0, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 220, delay: delayMs, easing: 'ease-out' },
      )
    },
    [delayMs],
  )
}
