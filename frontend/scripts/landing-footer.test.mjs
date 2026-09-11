import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

// Run from frontend: node --test scripts/landing-footer.test.mjs
// Render the real homepage with the project's TSX and alias configuration.
test('homepage footer includes тест and preserves the logo and copyright', async () => {
  const server = await createServer({
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    const { LandingPage } = await server.ssrLoadModule('/src/pages/LandingPage.tsx')
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(LandingPage)),
    )
    const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1]
    assert.ok(footer, 'homepage must render its footer')
    const text = footer.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    assert.match(text, /(?:^|\s)тест(?:\s|$)/, 'footer must contain the lowercase word тест')
    assert.match(text, /(?:^|\s)S\s+Сделка(?:\s|$)/, 'footer must preserve the logo')
    assert.ok(text.includes('© 2026 Сделка · sdelka.app'), 'footer must preserve the copyright')
  } finally {
    await server.close()
  }
})
