/** Яндекс.Метрика: счётчик подключён в index.html, здесь — отправка просмотров при смене маршрута в SPA. */
const COUNTER_ID = 112462966

declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void
  }
}

let lastUrl = ''

export function trackPageView(url: string) {
  if (!window.ym || url === lastUrl) return
  const referer = lastUrl || document.referrer
  lastUrl = url
  window.ym(COUNTER_ID, 'hit', url, { title: document.title, referer })
}
