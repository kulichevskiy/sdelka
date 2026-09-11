/**
 * Тонкая обёртка над fetch. Cookie-сессия ходит сама (credentials: 'include'),
 * ошибки бэкенда превращаются в ApiError с текстом из `detail`.
 */

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/** Куда уходить при 401. Auth-страницы сами обрабатывают 401, поэтому редирект только из приложения */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

function extractDetail(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    // Ошибки валидации FastAPI — массив; берём первое сообщение
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
  }
  return fallback
}

async function request<T>(method: Method, path: string, body?: unknown, csv = false): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    ...(csv ? { cache: 'no-store' as const } : {}),
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (csv && response.ok) {
    if (response.headers.get('content-type')?.split(';')[0].trim() !== 'text/csv') {
      throw new ApiError(response.status, 'Сервер не вернул CSV. Попробуйте ещё раз.')
    }
    return await response.blob() as T
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.()
    throw new ApiError(response.status, extractDetail(payload, `Ошибка ${response.status}`))
  }
  return payload as T
}

export const api = {
  csv: (path: string) => request<Blob>('GET', path, undefined, true),
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}
