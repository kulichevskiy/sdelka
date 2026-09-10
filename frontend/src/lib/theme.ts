import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'sales-hq-theme'

export function readTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // приватный режим
  }
  // По умолчанию светлая: продукт спроектирован в светлой палитре, тёмная — осознанный выбор в профиле
  return 'light'
}

/** Ставит .dark на html и color-scheme — Tailwind-варианты dark: работают от класса */
export function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  function setTheme(next: Theme) {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ок, просто не запомним
    }
  }

  return { theme, setTheme }
}

export const themeLabels: Record<Theme, string> = {
  light: 'Светлая',
  dark: 'Тёмная',
  system: 'Как в системе',
}
