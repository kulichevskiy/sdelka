/**
 * Мок бэкенда для разработки без API: перехватывает fetch на /api/* и держит
 * данные в памяти (и в localStorage, чтобы пережить перезагрузку).
 * Включается только через VITE_MOCK_API=true и не попадает в прод-сборку.
 * Реализует контракт docs/api-contract.md ровно настолько, чтобы UI можно было
 * прокликать; правила ролей и валидации — упрощённые.
 */
import seedJson from './demo-seed.json'
import type {
  Activity,
  Company,
  Contact,
  CustomField,
  Deal,
  LossReason,
  Me,
  Onboarding,
  Org,
  Stage,
  Task,
  User,
} from '../types'

interface MockUser extends User {
  password: string
  orgId: string
  isDemo: boolean
  onboardingDismissed: boolean
}
interface MockOrg extends Org {
  pipelineCustomized: boolean
}
interface Db {
  orgs: MockOrg[]
  users: MockUser[]
  stages: Array<Stage & { orgId: string }>
  companies: Array<Company & { orgId: string; isDemo: boolean }>
  contacts: Array<Contact & { orgId: string; isDemo: boolean }>
  deals: Array<Deal & { orgId: string; isDemo: boolean }>
  tasks: Array<Task & { orgId: string; isDemo: boolean }>
  activities: Array<Activity & { orgId: string; isDemo: boolean }>
  customFields: Array<CustomField & { orgId: string }>
  lossReasons: Array<Omit<LossReason, 'usageCount'> & { orgId: string }>
  invites: Array<{ token: string; userId: string }>
  resets: Array<{ token: string; userId: string }>
  sessionUserId: string | null
}

const STORAGE_KEY = 'sales-hq-mock-db'
const seed = seedJson as typeof seedJson & { today: string }

function emptyDb(): Db {
  return {
    orgs: [],
    users: [],
    stages: [],
    companies: [],
    contacts: [],
    deals: [],
    tasks: [],
    activities: [],
    customFields: [],
    lossReasons: [],
    invites: [],
    resets: [],
    sessionUserId: null,
  }
}

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    // битый кэш — начинаем с чистого
  }
  return emptyDb()
}

let db = load()
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

let counter = Date.now()
const uid = () => `m${(counter++).toString(36)}`
const todayIso = () => new Date().toISOString().slice(0, 10)
const nowIso = () => new Date().toISOString()

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Сдвигает дату из seed так, чтобы 2026-08-29 стала сегодняшним днём */
function shiftDate(iso: string): string {
  const base = new Date(`${seed.today}T00:00:00Z`).getTime()
  const delta = new Date(`${todayIso()}T00:00:00Z`).getTime() - base
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + delta).toISOString().slice(0, 10)
}

function strip<T extends { orgId?: string; isDemo?: boolean }>(item: T) {
  const { orgId: _o, isDemo: _d, ...rest } = item
  return rest
}

function currentUser(): MockUser {
  const user = db.users.find((u) => u.id === db.sessionUserId)
  if (!user || user.status !== 'active') throw new HttpError(401, 'Нужно войти')
  return user
}

function requireAdmin(user: MockUser) {
  if (user.role === 'member') throw new HttpError(403, 'Недостаточно прав')
}

function onboardingOf(user: MockUser): Onboarding {
  const orgId = user.orgId
  const org = db.orgs.find((o) => o.id === orgId)!
  return {
    dismissed: user.onboardingDismissed,
    hasDemoData: db.deals.some((d) => d.orgId === orgId && d.isDemo),
    items: [
      { key: 'deal', done: db.deals.some((d) => d.orgId === orgId) },
      { key: 'contact', done: db.contacts.some((c) => c.orgId === orgId) },
      { key: 'invite', done: db.users.filter((u) => u.orgId === orgId).length > 1 },
      { key: 'pipeline', done: org.pipelineCustomized },
      { key: 'task', done: db.tasks.some((t) => t.orgId === orgId) },
    ],
  }
}

function meOf(user: MockUser): Me {
  const org = db.orgs.find((o) => o.id === user.orgId)!
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    org: { id: org.id, name: org.name, currency: org.currency, createdAt: org.createdAt },
    onboarding: onboardingOf(user),
  }
}

function standardStages(orgId: string) {
  const names = ['Новая заявка', 'Квалификация', 'Предложение', 'Переговоры']
  return [
    ...names.map((name, index) => ({ id: uid(), orgId, name, order: index + 1, isClosing: false })),
    { id: uid(), orgId, name: 'Закрыто', order: names.length + 1, isClosing: true },
  ]
}

function orgStages(orgId: string) {
  return db.stages.filter((s) => s.orgId === orgId).sort((a, b) => a.order - b.order)
}

function loadDemo(user: MockUser) {
  const orgId = user.orgId
  if (db.deals.some((d) => d.orgId === orgId && d.isDemo)) {
    throw new HttpError(409, 'Демо-данные уже загружены')
  }
  const userMap = new Map<string, string>()
  for (const su of seed.users) {
    if (su.id === 'u1') {
      userMap.set(su.id, user.id)
      continue
    }
    const id = uid()
    userMap.set(su.id, id)
    const [local, domain] = su.email.split('@')
    db.users.push({
      id,
      orgId,
      name: su.name,
      email: `${local}+demo@${domain}`,
      role: su.role === 'admin' ? 'admin' : 'member',
      status: su.status === 'disabled' ? 'disabled' : 'invited',
      createdAt: nowIso(),
      password: '',
      isDemo: true,
      onboardingDismissed: true,
    })
  }
  const owner = (id: string) => userMap.get(id) ?? user.id

  const companyMap = new Map<string, string>()
  for (const c of seed.companies) {
    const id = uid()
    companyMap.set(c.id, id)
    db.companies.push({ ...c, id, orgId, ownerId: owner(c.ownerId), customValues: {}, createdAt: nowIso(), isDemo: true })
  }
  const contactMap = new Map<string, string>()
  for (const p of seed.contacts) {
    const id = uid()
    contactMap.set(p.id, id)
    db.contacts.push({
      ...p,
      id,
      orgId,
      companyId: companyMap.get(p.companyId)!,
      ownerId: owner(p.ownerId),
      customValues: {},
      createdAt: nowIso(),
      isDemo: true,
    })
  }

  // Раскладываем сделки по существующим стадиям: открытые по порядку, закрывающая — своя
  const stages = orgStages(orgId)
  const open = stages.filter((s) => !s.isClosing)
  const closing = stages.find((s) => s.isClosing)!
  const seedOpen = seed.stages.filter((s) => !s.isClosing)
  const stageMap = new Map<string, string>()
  seedOpen.forEach((s, index) => {
    stageMap.set(s.id, open.length ? open[index % open.length].id : closing.id)
  })
  stageMap.set('st5', closing.id)

  const dealMap = new Map<string, string>()
  for (const d of seed.deals) {
    const id = uid()
    dealMap.set(d.id, id)
    const { currency: _c, ...rest } = d
    db.deals.push({
      ...rest,
      id,
      orgId,
      companyId: companyMap.get(d.companyId)!,
      contactId: contactMap.get(d.contactId) ?? null,
      ownerId: owner(d.ownerId),
      stageId: stageMap.get(d.stageId)!,
      outcome: (d.outcome as Deal['outcome']) ?? null,
      expectedCloseDate: shiftDate(d.expectedCloseDate),
      createdAt: shiftDate(d.createdAt),
      customValues: {},
      isDemo: true,
    })
  }
  for (const t of seed.tasks) {
    db.tasks.push({
      ...t,
      id: uid(),
      orgId,
      dealId: dealMap.get(t.dealId)!,
      assigneeId: owner(t.assigneeId),
      dueDate: shiftDate(t.dueDate),
      isDemo: true,
    })
  }
  for (const a of seed.activities) {
    db.activities.push({
      ...a,
      id: uid(),
      orgId,
      type: a.type as Activity['type'],
      companyId: companyMap.get(a.companyId)!,
      contactId: a.contactId ? contactMap.get(a.contactId)! : null,
      dealId: a.dealId ? dealMap.get(a.dealId)! : null,
      authorId: owner(a.authorId),
      date: shiftDate(a.date),
      isDemo: true,
    })
  }
  const existingFields = new Set(db.customFields.filter((f) => f.orgId === orgId).map((f) => f.name))
  seed.customFields.forEach((f, index) => {
    if (existingFields.has(f.name)) return
    db.customFields.push({
      ...f,
      id: uid(),
      orgId,
      entity: f.entity as CustomField['entity'],
      type: f.type as CustomField['type'],
      order: index + 1,
    })
  })
  const existingReasons = new Set(db.lossReasons.filter((r) => r.orgId === orgId).map((r) => r.name))
  for (const r of seed.lossReasons) {
    if (existingReasons.has(r.name)) continue
    db.lossReasons.push({ id: uid(), orgId, name: r.name })
  }
}

function clearDemo(orgId: string) {
  const keep = <T extends { orgId: string; isDemo: boolean }>(items: T[]) =>
    items.filter((item) => !(item.orgId === orgId && item.isDemo))
  db.users = db.users.filter((u) => !(u.orgId === orgId && u.isDemo))
  db.companies = keep(db.companies)
  db.contacts = keep(db.contacts)
  db.deals = keep(db.deals)
  db.tasks = keep(db.tasks)
  db.activities = keep(db.activities)
}

type Handler = (params: Record<string, string>, body: any, query: URLSearchParams) => unknown

const routes: Array<{ method: string; pattern: RegExp; keys: string[]; handler: Handler }> = []

function route(method: string, path: string, handler: Handler) {
  const keys: string[] = []
  const pattern = new RegExp(
    '^' + path.replace(/:(\w+)/g, (_m, key: string) => (keys.push(key), '([^/]+)')) + '$',
  )
  routes.push({ method, pattern, keys, handler })
}

function findOrg<T extends { id: string; orgId: string }>(items: T[], id: string, user: MockUser): T {
  const item = items.find((i) => i.id === id && i.orgId === user.orgId)
  if (!item) throw new HttpError(404, 'Не найдено')
  return item
}

// ---- Auth ----

route('POST', '/auth/register', (_p, body) => {
  if (db.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
    throw new HttpError(409, 'Эта почта уже зарегистрирована')
  }
  if (!body.password || body.password.length < 8) throw new HttpError(422, 'Пароль короче 8 символов')
  const org: MockOrg = {
    id: uid(),
    name: body.orgName,
    currency: body.currency,
    createdAt: nowIso(),
    pipelineCustomized: false,
  }
  db.orgs.push(org)
  const user: MockUser = {
    id: uid(),
    orgId: org.id,
    name: body.name,
    email: body.email,
    role: 'owner',
    status: 'active',
    createdAt: nowIso(),
    password: body.password,
    isDemo: false,
    onboardingDismissed: false,
  }
  db.users.push(user)
  if (body.pipelineTemplate === 'standard') db.stages.push(...standardStages(org.id))
  else db.stages.push({ id: uid(), orgId: org.id, name: 'Закрыто', order: 1, isClosing: true })
  db.sessionUserId = user.id
  return meOf(user)
})

route('POST', '/auth/login', (_p, body) => {
  const user = db.users.find((u) => u.email.toLowerCase() === body.email?.toLowerCase())
  if (!user || user.password !== body.password) throw new HttpError(401, 'Неверная почта или пароль')
  if (user.status === 'disabled') throw new HttpError(403, 'Доступ отключён администратором')
  db.sessionUserId = user.id
  return meOf(user)
})

route('POST', '/auth/logout', () => {
  db.sessionUserId = null
  return null
})

route('GET', '/auth/me', () => meOf(currentUser()))
route('PATCH', '/auth/me', (_p, body) => {
  const user = currentUser()
  if (body.name) user.name = body.name
  return meOf(user)
})
route('POST', '/auth/change-password', (_p, body) => {
  const user = currentUser()
  if (user.password !== body.currentPassword) throw new HttpError(400, 'Текущий пароль неверный')
  user.password = body.newPassword
  return null
})
route('GET', '/auth/invite/:token', ({ token }) => {
  const invite = db.invites.find((i) => i.token === token)
  const user = invite && db.users.find((u) => u.id === invite.userId)
  if (!user || user.status !== 'invited') throw new HttpError(404, 'Приглашение недействительно')
  const org = db.orgs.find((o) => o.id === user.orgId)!
  const inviter = db.users.find((u) => u.orgId === org.id && u.role === 'owner')
  return { email: user.email, orgName: org.name, inviterName: inviter?.name ?? '', role: user.role }
})
route('POST', '/auth/accept-invite', (_p, body) => {
  const invite = db.invites.find((i) => i.token === body.token)
  const user = invite && db.users.find((u) => u.id === invite.userId)
  if (!user || user.status !== 'invited') throw new HttpError(404, 'Приглашение недействительно')
  user.name = body.name
  user.password = body.password
  user.status = 'active'
  db.invites = db.invites.filter((i) => i !== invite)
  db.sessionUserId = user.id
  return meOf(user)
})
route('POST', '/auth/forgot-password', () => null)
route('GET', '/auth/reset/:token', ({ token }) => {
  const reset = db.resets.find((r) => r.token === token)
  const user = reset && db.users.find((u) => u.id === reset.userId)
  if (!user) throw new HttpError(404, 'Ссылка недействительна')
  return { email: user.email }
})
route('POST', '/auth/reset-password', (_p, body) => {
  const reset = db.resets.find((r) => r.token === body.token)
  const user = reset && db.users.find((u) => u.id === reset.userId)
  if (!user) throw new HttpError(404, 'Ссылка недействительна')
  user.password = body.password
  db.resets = db.resets.filter((r) => r !== reset)
  return null
})

// ---- Org ----

route('GET', '/org', () => meOf(currentUser()).org)
route('PATCH', '/org', (_p, body) => {
  const user = currentUser()
  requireAdmin(user)
  const org = db.orgs.find((o) => o.id === user.orgId)!
  if (body.name) org.name = body.name
  if (body.currency) org.currency = body.currency
  return meOf(user).org
})
route('POST', '/org/onboarding/dismiss', () => {
  const user = currentUser()
  user.onboardingDismissed = true
  return onboardingOf(user)
})
route('POST', '/org/demo-data', () => {
  const user = currentUser()
  requireAdmin(user)
  loadDemo(user)
  return null
})
route('DELETE', '/org/demo-data', () => {
  const user = currentUser()
  requireAdmin(user)
  clearDemo(user.orgId)
  return null
})

// ---- Users ----

route('GET', '/users', () => {
  const user = currentUser()
  return db.users
    .filter((u) => u.orgId === user.orgId)
    .map(({ password: _p, orgId: _o, isDemo: _d, onboardingDismissed: _ob, ...rest }) => rest)
})
route('POST', '/users/invite', (_p, body) => {
  const user = currentUser()
  requireAdmin(user)
  if (db.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
    throw new HttpError(409, 'Пользователь с этой почтой уже есть')
  }
  const invited: MockUser = {
    id: uid(),
    orgId: user.orgId,
    name: body.email.split('@')[0],
    email: body.email,
    role: body.role,
    status: 'invited',
    createdAt: nowIso(),
    password: '',
    isDemo: false,
    onboardingDismissed: true,
  }
  db.users.push(invited)
  const token = uid() + uid()
  db.invites.push({ token, userId: invited.id })
  const { password: _pw, orgId: _o, isDemo: _d, onboardingDismissed: _ob, ...rest } = invited
  return { user: rest, inviteUrl: `${location.origin}/invite/${token}` }
})
route('POST', '/users/:id/resend-invite', ({ id }) => {
  const user = currentUser()
  requireAdmin(user)
  const target = findOrg(db.users, id, user)
  if (target.status !== 'invited') throw new HttpError(409, 'Пользователь уже принял приглашение')
  db.invites = db.invites.filter((i) => i.userId !== id)
  const token = uid() + uid()
  db.invites.push({ token, userId: id })
  return { inviteUrl: `${location.origin}/invite/${token}` }
})
route('POST', '/users/:id/reset-link', ({ id }) => {
  const user = currentUser()
  requireAdmin(user)
  const target = findOrg(db.users, id, user)
  if (target.status !== 'active') throw new HttpError(409, 'Сброс доступен только активным')
  const token = uid() + uid()
  db.resets.push({ token, userId: id })
  return { resetUrl: `${location.origin}/reset/${token}` }
})
route('PATCH', '/users/:id', ({ id }, body) => {
  const user = currentUser()
  requireAdmin(user)
  const target = findOrg(db.users, id, user)
  if (target.id === user.id) throw new HttpError(403, 'Себя менять нельзя')
  if (target.role === 'owner') throw new HttpError(403, 'Владельца менять нельзя')
  if (target.role === 'admin' && user.role !== 'owner') throw new HttpError(403, 'Только владелец меняет админов')
  if (body.role) target.role = body.role
  if (body.status) target.status = body.status
  const { password: _pw, orgId: _o, isDemo: _d, onboardingDismissed: _ob, ...rest } = target
  return rest
})
route('POST', '/users/:id/transfer-ownership', ({ id }) => {
  const user = currentUser()
  if (user.role !== 'owner') throw new HttpError(403, 'Только владелец')
  const target = findOrg(db.users, id, user)
  if (target.status !== 'active') throw new HttpError(409, 'Передать можно только активному')
  target.role = 'owner'
  user.role = 'admin'
  return null
})
route('DELETE', '/users/:id', ({ id }) => {
  const user = currentUser()
  requireAdmin(user)
  const target = findOrg(db.users, id, user)
  if (target.status !== 'invited') throw new HttpError(409, 'Удалять можно только приглашения')
  db.users = db.users.filter((u) => u.id !== id)
  return null
})

// ---- Stages ----

function markPipeline(orgId: string) {
  db.orgs.find((o) => o.id === orgId)!.pipelineCustomized = true
}
route('GET', '/stages', () => orgStages(currentUser().orgId).map(strip))
route('POST', '/stages', (_p, body) => {
  const user = currentUser()
  requireAdmin(user)
  const stages = orgStages(user.orgId)
  const closing = stages.find((s) => s.isClosing)
  const stage = { id: uid(), orgId: user.orgId, name: body.name, order: 0, isClosing: false }
  const ordered = closing ? [...stages.filter((s) => !s.isClosing), stage, closing] : [...stages, stage]
  ordered.forEach((s, i) => (s.order = i + 1))
  db.stages.push(stage)
  markPipeline(user.orgId)
  return strip(stage)
})
route('PATCH', '/stages/:id', ({ id }, body) => {
  const user = currentUser()
  requireAdmin(user)
  const stage = findOrg(db.stages, id, user)
  stage.name = body.name
  markPipeline(user.orgId)
  return strip(stage)
})
route('PUT', '/stages/order', (_p, body) => {
  const user = currentUser()
  requireAdmin(user)
  const stages = orgStages(user.orgId)
  const ids: string[] = body.ids
  const ordered = [
    ...ids.map((id) => stages.find((s) => s.id === id)!).filter((s) => s && !s.isClosing),
    ...stages.filter((s) => s.isClosing),
  ]
  ordered.forEach((s, i) => (s.order = i + 1))
  markPipeline(user.orgId)
  return orgStages(user.orgId).map(strip)
})
route('DELETE', '/stages/:id', ({ id }, _b, query) => {
  const user = currentUser()
  requireAdmin(user)
  const stage = findOrg(db.stages, id, user)
  if (stage.isClosing) throw new HttpError(409, 'Закрывающую стадию удалить нельзя')
  const dealsOn = db.deals.filter((d) => d.stageId === id)
  const moveTo = query.get('moveTo')
  if (dealsOn.length && !moveTo) throw new HttpError(409, 'На стадии есть сделки, укажите moveTo')
  if (moveTo) dealsOn.forEach((d) => (d.stageId = moveTo))
  db.stages = db.stages.filter((s) => s.id !== id)
  orgStages(user.orgId).forEach((s, i) => (s.order = i + 1))
  markPipeline(user.orgId)
  return null
})

// ---- Companies / contacts ----

route('GET', '/companies', () =>
  db.companies.filter((c) => c.orgId === currentUser().orgId).map(strip),
)
route('POST', '/companies', (_p, body) => {
  const user = currentUser()
  const company = {
    id: uid(),
    orgId: user.orgId,
    name: body.name,
    industry: body.industry ?? '',
    website: body.website ?? '',
    phone: body.phone ?? '',
    ownerId: body.ownerId ?? user.id,
    note: body.note ?? '',
    customValues: body.customValues ?? {},
    createdAt: nowIso(),
    isDemo: false,
  }
  db.companies.push(company)
  return strip(company)
})
route('PATCH', '/companies/:id', ({ id }, body) => {
  const company = findOrg(db.companies, id, currentUser())
  Object.assign(company, body)
  return strip(company)
})
route('GET', '/contacts', () =>
  db.contacts.filter((c) => c.orgId === currentUser().orgId).map(strip),
)
route('POST', '/contacts', (_p, body) => {
  const user = currentUser()
  const contact = {
    id: uid(),
    orgId: user.orgId,
    name: body.name,
    position: body.position ?? '',
    companyId: body.companyId,
    email: body.email ?? '',
    phone: body.phone ?? '',
    ownerId: body.ownerId ?? user.id,
    customValues: body.customValues ?? {},
    createdAt: nowIso(),
    isDemo: false,
  }
  db.contacts.push(contact)
  return strip(contact)
})
route('PATCH', '/contacts/:id', ({ id }, body) => {
  const contact = findOrg(db.contacts, id, currentUser())
  Object.assign(contact, body)
  return strip(contact)
})

// ---- Deals ----

route('GET', '/deals', () => db.deals.filter((d) => d.orgId === currentUser().orgId).map(strip))
route('POST', '/deals', (_p, body) => {
  const user = currentUser()
  const stages = orgStages(user.orgId)
  const first = stages.find((s) => !s.isClosing) ?? stages[0]
  const deal = {
    id: uid(),
    orgId: user.orgId,
    title: body.title,
    companyId: body.companyId,
    contactId: body.contactId ?? null,
    ownerId: body.ownerId ?? user.id,
    stageId: first.id,
    amount: body.amount ?? 0,
    expectedCloseDate: body.expectedCloseDate ?? null,
    createdAt: todayIso(),
    outcome: null,
    lostReason: null,
    description: body.description ?? '',
    customValues: body.customValues ?? {},
    isDemo: false,
  }
  db.deals.push(deal)
  return strip(deal)
})
route('PATCH', '/deals/:id', ({ id }, body) => {
  const deal = findOrg(db.deals, id, currentUser())
  Object.assign(deal, body)
  return strip(deal)
})
route('POST', '/deals/:id/move', ({ id }, body) => {
  const user = currentUser()
  const deal = findOrg(db.deals, id, user)
  const stage = findOrg(db.stages, body.stageId, user)
  if (stage.isClosing) {
    if (!body.outcome) throw new HttpError(422, 'Для закрытия нужен исход')
    if (body.outcome === 'lost' && !body.lostReason) throw new HttpError(422, 'Укажите причину проигрыша')
    deal.outcome = body.outcome
    deal.lostReason = body.outcome === 'lost' ? body.lostReason : null
  } else {
    deal.outcome = null
    deal.lostReason = null
  }
  deal.stageId = stage.id
  return strip(deal)
})
route('DELETE', '/deals/:id', ({ id }) => {
  const user = currentUser()
  requireAdmin(user)
  findOrg(db.deals, id, user)
  db.deals = db.deals.filter((d) => d.id !== id)
  db.tasks = db.tasks.filter((t) => t.dealId !== id)
  db.activities.forEach((a) => a.dealId === id && (a.dealId = null))
  return null
})

// ---- Tasks / activities ----

route('GET', '/tasks', () => db.tasks.filter((t) => t.orgId === currentUser().orgId).map(strip))
route('POST', '/tasks', (_p, body) => {
  const user = currentUser()
  findOrg(db.deals, body.dealId, user)
  const task = {
    id: uid(),
    orgId: user.orgId,
    dealId: body.dealId,
    title: body.title,
    dueDate: body.dueDate,
    isDone: false,
    assigneeId: body.assigneeId ?? user.id,
    isDemo: false,
  }
  db.tasks.push(task)
  return strip(task)
})
route('PATCH', '/tasks/:id', ({ id }, body) => {
  const task = findOrg(db.tasks, id, currentUser())
  Object.assign(task, body)
  return strip(task)
})
route('DELETE', '/tasks/:id', ({ id }) => {
  findOrg(db.tasks, id, currentUser())
  db.tasks = db.tasks.filter((t) => t.id !== id)
  return null
})
route('GET', '/activities', () =>
  db.activities.filter((a) => a.orgId === currentUser().orgId).map(strip),
)
route('POST', '/activities', (_p, body) => {
  const user = currentUser()
  const activity = {
    id: uid(),
    orgId: user.orgId,
    companyId: body.companyId,
    contactId: body.contactId ?? null,
    dealId: body.dealId ?? null,
    type: body.type,
    authorId: user.id,
    date: body.date ?? todayIso(),
    note: body.note,
    isDemo: false,
  }
  db.activities.push(activity)
  return strip(activity)
})

// ---- Settings ----

route('GET', '/custom-fields', () =>
  db.customFields
    .filter((f) => f.orgId === currentUser().orgId)
    .sort((a, b) => a.order - b.order)
    .map(strip),
)
route('POST', '/custom-fields', (_p, body) => {
  const user = currentUser()
  requireAdmin(user)
  const field = {
    id: uid(),
    orgId: user.orgId,
    name: body.name,
    entity: body.entity,
    type: body.type,
    isRequired: body.isRequired,
    options: body.options ?? [],
    order: db.customFields.filter((f) => f.orgId === user.orgId).length + 1,
  }
  db.customFields.push(field)
  return strip(field)
})
route('PATCH', '/custom-fields/:id', ({ id }, body) => {
  const user = currentUser()
  requireAdmin(user)
  const field = findOrg(db.customFields, id, user)
  Object.assign(field, body)
  return strip(field)
})
route('DELETE', '/custom-fields/:id', ({ id }) => {
  const user = currentUser()
  requireAdmin(user)
  findOrg(db.customFields, id, user)
  db.customFields = db.customFields.filter((f) => f.id !== id)
  return null
})
route('GET', '/loss-reasons', () => {
  const user = currentUser()
  return db.lossReasons
    .filter((r) => r.orgId === user.orgId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      usageCount: db.deals.filter((d) => d.orgId === user.orgId && d.lostReason === r.name).length,
    }))
})
route('POST', '/loss-reasons', (_p, body) => {
  const user = currentUser()
  requireAdmin(user)
  const reason = { id: uid(), orgId: user.orgId, name: body.name }
  db.lossReasons.push(reason)
  return { id: reason.id, name: reason.name, usageCount: 0 }
})
route('PATCH', '/loss-reasons/:id', ({ id }, body) => {
  const user = currentUser()
  requireAdmin(user)
  const reason = findOrg(db.lossReasons, id, user)
  db.deals.forEach((d) => d.orgId === user.orgId && d.lostReason === reason.name && (d.lostReason = body.name))
  reason.name = body.name
  return { id: reason.id, name: reason.name, usageCount: 0 }
})
route('DELETE', '/loss-reasons/:id', ({ id }) => {
  const user = currentUser()
  requireAdmin(user)
  findOrg(db.lossReasons, id, user)
  db.lossReasons = db.lossReasons.filter((r) => r.id !== id)
  return null
})
route('GET', '/health', () => ({ status: 'ok' }))

/** Подменяет window.fetch: всё, что не /api, идёт в настоящий fetch */
export function installMockApi() {
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin)
    if (!url.pathname.startsWith('/api/')) return realFetch(input, init)

    const method = (init?.method ?? 'GET').toUpperCase()
    const path = url.pathname.slice(4)
    const body = init?.body ? JSON.parse(String(init.body)) : undefined

    // Небольшая задержка, чтобы спиннеры и оптимистичные обновления были видны
    await new Promise((resolve) => setTimeout(resolve, 120))

    for (const r of routes) {
      if (r.method !== method) continue
      const match = r.pattern.exec(path)
      if (!match) continue
      const params = Object.fromEntries(r.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]))
      try {
        const result = r.handler(params, body, url.searchParams)
        save()
        return result === null ? json(204) : json(200, result)
      } catch (error) {
        if (error instanceof HttpError) return json(error.status, { detail: error.message })
        throw error
      }
    }
    return json(404, { detail: `Мок не знает ${method} ${path}` })
  }
  console.info('[mock-api] включён: данные в localStorage, ключ', STORAGE_KEY)
}
