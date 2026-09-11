import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

// Against a local test backend (migrated crm_test) and Vite, never production.
// PLAYWRIGHT_BROWSERS_PATH=... node scripts/deals-export.browser.mjs
const base = 'http://127.0.0.1:5173'
const output = new URL('../../.pytest_cache/sdl-2-evidence/', import.meta.url).pathname
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
// Keep fixture data local, including analytics loaded by the existing page.
await context.route('**/*', (route) => {
  const url = new URL(route.request().url())
  return url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.protocol === 'blob:'
    ? route.continue() : route.abort()
})
async function request(method, path, data) {
  const response = await context.request[method](`${base}/api${path}`, data ? { data } : undefined)
  assert.ok(response.ok(), `${method} ${path}: ${response.status()}`)
  return response.status() === 204 ? null : response.json()
}
async function download(name) {
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'скачать как csv', exact: true }).click()
  const file = await event
  assert.equal(file.suggestedFilename(), 'deals.csv')
  assert.equal(await file.failure(), null)
  await file.saveAs(`${output}${name}`)
  return readFile(`${output}${name}`)
}
try {
  await request('post', '/auth/register', {
    name: 'CSV Проверка', email: `csv-${Date.now()}@example.com`, password: 'fixture-only-password',
    orgName: 'CSV тест', currency: 'RUB', pipelineTemplate: 'standard',
  })
  await page.goto(`${base}/deals`)
  await page.getByRole('button', { name: 'скачать как csv', exact: true }).waitFor()
  const empty = await download('empty.csv')
  assert.deepEqual([...empty.subarray(0, 3)], [239, 187, 191])
  assert.equal(empty.toString('utf8').trim().split('\r\n').length, 1)
  const company = await request('post', '/companies', { name: 'ООО "Тест", продажи' })
  const field = await request('post', '/custom-fields', { name: '=Заголовок', entity: 'deal', type: 'text', isRequired: false })
  const stages = await request('get', '/stages')
  const closing = stages.find((s) => s.isClosing)
  const deals = []
  for (const outcome of [null, 'won', 'lost']) {
    const deal = await request('post', '/deals', {
      title: `CSV ${outcome ?? 'open'}`, companyId: company.id, amount: 123.45,
      description: 'Кириллица, "кавычки";\nВторая строка', customValues: { [field.id]: '=1+1' },
    })
    if (outcome) await request('post', `/deals/${deal.id}/move`, { stageId: closing.id, outcome, lostReason: 'Дорого' })
    deals.push(deal)
  }
  await page.reload()
  await page.getByText('CSV open', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Требуют внимания' }).click()
  assert.equal(await page.getByText('CSV won', { exact: true }).count(), 0)
  // New server data after UI hydration must appear, even though it is absent from the board cache.
  deals.push(await request('post', '/deals', { title: 'Свежая сделка', companyId: company.id }))
  const downloaded = await download('deals.csv')
  for (const deal of deals) assert.ok(downloaded.toString('utf8').includes(deal.id))
  assert.ok(downloaded.toString('utf8').includes("'=Заголовок"))
  assert.ok(downloaded.toString('utf8').includes("'=1+1"))
  const direct = await context.request.get(`${base}/api/deals/export.csv`)
  assert.deepEqual(downloaded, await direct.body())
  await page.screenshot({ path: `${output}download-desktop.png`, fullPage: true })
  let downloads = 0
  page.on('download', () => { downloads++ })
  let release
  let pending
  const requestStarted = new Promise((resolve) => { pending = resolve })
  const responseGate = new Promise((resolve) => { release = resolve })
  await page.route('**/api/deals/export.csv', async (route) => {
    pending()
    await responseGate
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Тестовая ошибка"}' })
  })
  const button = page.getByRole('button', { name: 'скачать как csv', exact: true })
  await button.click()
  await requestStarted
  assert.ok(await button.isDisabled(), 'export button disabled while loading')
  release()
  await page.getByRole('alert').filter({ hasText: 'Не удалось скачать сделки' }).waitFor()
  assert.equal(downloads, 0)
  assert.ok(await button.isEnabled())
  await page.screenshot({ path: `${output}download-error.png`, fullPage: true })
  await page.unroute('**/api/deals/export.csv')
  await download('retry.csv')
  assert.equal(await page.getByRole('alert').filter({ hasText: 'Не удалось скачать сделки' }).count(), 0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: `${output}download-mobile.png`, fullPage: true })
  assert.ok(await button.isVisible())
  // Existing table/filter/create actions still work after export and retry.
  await page.getByRole('button', { name: 'Таблица', exact: true }).click()
  await page.getByRole('button', { name: 'Требуют внимания' }).click()
  await page.getByText('CSV won', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Новая сделка', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  assert.deepEqual(errors, [])
  await writeFile(`${output}browser-result.json`, JSON.stringify({
    result: 'passed', downloadedIds: deals.map((d) => d.id), bytes: downloaded.length,
    verified: ['empty CSV', 'real click/download', 'all open/won/lost IDs', 'fresh uncached deal', 'independent of attention filter', 'download bytes equal real API response', 'formula header/value', 'pending disabled', '500 no download + visible error', 'retry', 'mobile visible', 'table/filter/create-dialog regression'],
    pageErrors: errors,
  }, null, 2))
  console.log('PASS: real browser CSV download, empty/filter/freshness/error/retry/mobile and regression checks')
} finally {
  await context.close()
  await browser.close()
}
