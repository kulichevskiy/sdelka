import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'

// Real HTTP/API + production download wiring without a browser. No credential/session logging.
const output = new URL('../../.pytest_cache/sdl-2-evidence/', import.meta.url).pathname
const base = 'http://127.0.0.1:8000'
const fetchHttp = globalThis.fetch
const server = await createServer({ server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] } })
let cookie
async function request(method, path, data) {
  const response = await fetchHttp(`${base}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  })
  assert.ok(response.ok, `${method} ${path}: ${response.status}`)
  const session = response.headers.get('set-cookie')
  if (session) cookie = session.split(';')[0]
  return response.status === 204 ? null : response.json()
}
try {
  await request('POST', '/auth/register', {
    name: 'CSV Проверка', email: `csv-${Date.now()}@example.com`, password: 'fixture-only-password',
    orgName: 'CSV тест', currency: 'RUB', pipelineTemplate: 'standard',
  })
  const company = await request('POST', '/companies', { name: 'ООО "Тест", продажи' })
  const field = await request('POST', '/custom-fields', { name: '=Заголовок', entity: 'deal', type: 'text', isRequired: false })
  const stages = await request('GET', '/stages')
  const closing = stages.find((s) => s.isClosing)
  const deals = []
  for (const outcome of [null, 'won', 'lost']) {
    const deal = await request('POST', '/deals', {
      title: `CSV ${outcome ?? 'open'}`, companyId: company.id, amount: 123.45,
      description: 'Кириллица, "кавычки";\nВторая строка', customValues: { [field.id]: '=1+1' },
    })
    if (outcome) await request('POST', `/deals/${deal.id}/move`, { stageId: closing.id, outcome, lostReason: 'Дорого' })
    deals.push(deal)
  }
  let blob
  let saved
  globalThis.fetch = (path, options) => {
    assert.equal(path, '/api/deals/export.csv')
    assert.equal(options.credentials, 'include')
    return fetchHttp(`${base}${path}`, { ...options, headers: { Cookie: cookie } })
  }
  URL.createObjectURL = (value) => { blob = value; return 'blob:test-download' }
  URL.revokeObjectURL = () => {}
  globalThis.document = {
    body: { append() {} },
    createElement() {
      return {
        remove() {},
        click() {
          assert.equal(this.download, 'deals.csv')
          saved = blob.arrayBuffer().then((bytes) => writeFile(`${output}api-download.csv`, new Uint8Array(bytes)))
        },
      }
    },
  }
  const { downloadDealsCsv } = await server.ssrLoadModule('/src/api/deals-export.ts')
  await downloadDealsCsv()
  await saved
  const bytes = await readFile(`${output}api-download.csv`)
  const direct = await fetchHttp(`${base}/api/deals/export.csv`, { headers: { Cookie: cookie } })
  assert.deepEqual(bytes, Buffer.from(await direct.arrayBuffer()))
  const metadata = {
    result: 'passed', mode: 'real HTTP + production download function + simulated anchor click; NOT browser UI',
    request: 'GET /api/deals/export.csv', status: direct.status,
    contentType: direct.headers.get('content-type'), disposition: direct.headers.get('content-disposition'),
    cacheControl: direct.headers.get('cache-control'), bytes: bytes.length,
    expectedIds: deals.map((d) => d.id), csvPath: `${output}api-download.csv`,
  }
  await writeFile(`${output}api-download-result.json`, JSON.stringify(metadata, null, 2))
  console.log(JSON.stringify(metadata, null, 2))
} finally {
  await server.close()
}
