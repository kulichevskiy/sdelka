import { useState, type FormEvent } from 'react'
import { Check, Copy, Trash2 } from 'lucide-react'
import { useApiTokenMutations, useApiTokens } from '@/api/queries'
import type { ApiTokenCreated } from '@/api/types'
import { Alert, Button, Field } from '@/components/ui'

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (iso: string) => dateFormat.format(new Date(iso))

/** Личные токены для API: выпуск, список и отзыв. Сам токен виден один раз — сразу после выпуска */
export function ApiTokensSection() {
  const tokens = useApiTokens()
  const { create, revoke } = useApiTokenMutations()
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<ApiTokenCreated | null>(null)
  const [copied, setCopied] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: (created) => {
          setFresh(created)
          setCopied(false)
          setName('')
        },
      },
    )
  }

  async function copy() {
    if (!fresh) return
    try {
      await navigator.clipboard.writeText(fresh.token)
      setCopied(true)
    } catch {
      // Буфер недоступен (http, запрет в браузере) — токен остаётся на экране, его можно выделить
    }
  }

  function remove(id: string) {
    revoke.mutate(id, { onSuccess: () => setFresh((token) => (token?.id === id ? null : token)) })
  }

  return (
    <section className="mt-4 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
      <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">API-токены</h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Токен работает от вашего имени и с вашими правами. Передавайте его в заголовке{' '}
        <code className="rounded bg-stone-100 px-1 py-0.5 text-xs dark:bg-stone-800">Authorization: Bearer …</code>. Методы
        описаны в{' '}
        <a href="/api/docs" target="_blank" rel="noreferrer" className="font-medium text-stone-900 underline underline-offset-2 dark:text-stone-100">
          документации API
        </a>
        .
      </p>

      <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Название"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          placeholder="Например, «Выгрузка в 1С»"
          className="flex-1"
        />
        <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
          Выпустить токен
        </Button>
      </form>
      {create.error && <div className="mt-3"><Alert>{create.error.message}</Alert></div>}

      {fresh && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Скопируйте токен «{fresh.name}» сейчас: после перезагрузки страницы он больше не покажется.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-white px-2 py-1.5 font-mono text-xs whitespace-nowrap text-stone-900 select-all dark:bg-stone-900 dark:text-stone-100">
              {fresh.token}
            </code>
            <Button variant="secondary" onClick={copy} className="shrink-0">
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? 'Скопировано' : 'Копировать'}
            </Button>
          </div>
        </div>
      )}

      {tokens.error && <div className="mt-3"><Alert>{tokens.error.message}</Alert></div>}
      {revoke.error && <div className="mt-3"><Alert>{revoke.error.message}</Alert></div>}

      {tokens.data && tokens.data.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
          {tokens.data.map((token) => (
            <li key={token.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">{token.name}</div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-mono">{token.prefix}…</span> · выпущен {formatDate(token.createdAt)} ·{' '}
                  {token.lastUsedAt ? `использован ${formatDate(token.lastUsedAt)}` : 'ещё не использован'}
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => remove(token.id)}
                loading={revoke.isPending && revoke.variables === token.id}
                aria-label={`Отозвать токен «${token.name}»`}
                className="shrink-0"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Отозвать
              </Button>
            </li>
          ))}
        </ul>
      )}
      {tokens.data?.length === 0 && (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">Токенов пока нет.</p>
      )}
    </section>
  )
}
