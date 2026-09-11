import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createServer } from 'vite'

// Exercise the real API client and download action; only browser globals/network are replaced.
test('the real deals page renders CSV action even with an empty or loading list', async () => {
  const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] } })
  try {
    const { DealsPage } = await server.ssrLoadModule('/src/pages/DealsPage.tsx')
    const { AppLayout } = await server.ssrLoadModule('/src/routes/AppLayout.tsx')
    const me = { user: { id: 'user', name: 'Анна', role: 'member', email: 'fixture@example.com' }, org: { id: 'org', name: 'Тест', currency: 'RUB' }, onboarding: { dismissed: true, items: [], hasDemoData: false } }
    for (const loaded of [false, true]) {
      const client = new QueryClient()
      if (loaded) client.setQueryData(['deals'], [])
      const html = renderToStaticMarkup(createElement(QueryClientProvider, { client },
        createElement(MemoryRouter, { initialEntries: ['/deals?search=not-found'] },
          createElement(Routes, null,
            createElement(Route, { element: createElement(AppLayout, { me }) },
              createElement(Route, { path: '/deals', element: createElement(DealsPage) }))))))
      assert.match(html, /скачать как csv/)
      assert.match(html, /Новая сделка/)
      assert.match(html, /Требуют внимания/)
      client.clear()
    }
  } finally {
    await server.close()
  }
})

test('export action renders the exact label with the shared button', async () => {
  const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] } })
  try {
    const { ExportDealsButton } = await server.ssrLoadModule('/src/app/ExportDealsButton.tsx')
    const html = renderToStaticMarkup(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(ExportDealsButton)))
    assert.match(html, /<button[^>]*>[^]*скачать как csv[^]*<\/button>/)
    assert.doesNotMatch(html, / disabled=""/)
  } finally {
    await server.close()
  }
})

test('CSV download waits for a complete response, uses auth, and never saves errors', async () => {
  const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] } })
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  try {
    const { downloadDealsCsv } = await server.ssrLoadModule('/src/api/deals-export.ts')
    const { setUnauthorizedHandler } = await server.ssrLoadModule('/src/api/client.ts')
    let downloaded = 0
    let savedBlob
    let revoked = 0
    const anchor = { href: '', download: '', click() { downloaded++; assert.equal(this.download, 'deals.csv') }, remove() {} }
    globalThis.document = { createElement: () => anchor, body: { append: () => {} } }
    URL.createObjectURL = (blob) => { savedBlob = blob; return 'blob:test' }
    URL.revokeObjectURL = () => { revoked++ }
    const csv = '\ufeffID,Название\r\n1,"Сделка, первая"\r\n'
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/deals/export.csv')
      assert.equal(options.credentials, 'include')
      assert.equal(options.cache, 'no-store')
      return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8' } })
    }
    await downloadDealsCsv()
    assert.equal(downloaded, 1)
    assert.deepEqual(new Uint8Array(await savedBlob.arrayBuffer()), new TextEncoder().encode(csv))
    // HTTP and network failures must not trigger any new download.
    for (const status of [401, 403, 500]) {
      let unauthorized = false
      setUnauthorizedHandler(() => { unauthorized = true })
      globalThis.fetch = async () => new Response('{"detail":"Ошибка экспорта"}', { status })
      await assert.rejects(downloadDealsCsv, /Ошибка экспорта/)
      assert.equal(unauthorized, status === 401)
    }
    globalThis.fetch = async () => { throw new Error('offline') }
    await assert.rejects(downloadDealsCsv, /offline/)
    globalThis.fetch = async () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } })
    await assert.rejects(downloadDealsCsv)
    globalThis.fetch = async () => ({ ok: true, status: 200, headers: new Headers({ 'content-type': 'text/csv' }), blob: async () => { throw new Error('truncated') } })
    await assert.rejects(downloadDealsCsv, /truncated/)
    assert.equal(downloaded, 1)
    await new Promise((resolve) => setTimeout(resolve, 1100))
    assert.equal(revoked, 1)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    await server.close()
  }
})
