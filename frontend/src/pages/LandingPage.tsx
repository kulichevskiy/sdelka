import { Link } from 'react-router-dom'
import { ArrowRight, Building2, CalendarCheck, KanbanSquare, Users } from 'lucide-react'
import { FONT, Logo } from '@/components/ui'
import { LiveBoardMock } from '@/components/LiveBoardMock'

const features = [
  {
    icon: CalendarCheck,
    title: 'Рабочий стол на сегодня',
    text: 'Просроченное, дела на сегодня и сделки без следующего шага — в одном списке. Открыли утром и знаете, с чего начать.',
  },
  {
    icon: KanbanSquare,
    title: 'Канбан сделок',
    text: 'Стадии под ваш процесс, перетаскивание карточек, суммы по колонкам. Закрытие с исходом и причиной проигрыша.',
  },
  {
    icon: Building2,
    title: 'Единая история клиента',
    text: 'Компания, люди в ней, сделки и все звонки, письма и встречи — на одной карточке. Ничего не теряется при передаче.',
  },
  {
    icon: Users,
    title: 'Команда и роли',
    text: 'Приглашайте коллег по ссылке. Владелец, админы и менеджеры: кто настраивает воронку, кто ведёт сделки.',
  },
]

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400'
const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-900 dark:text-stone-100" style={{ fontFamily: FONT }}>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800">
            Войти
          </Link>
          <Link to="/register" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400">
            Начать бесплатно
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-24">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase dark:text-stone-400">CRM для небольших отделов продаж</p>
            <h1 className="mt-3 text-4xl leading-[1.05] font-black tracking-tight sm:text-5xl lg:text-6xl">
              Каждая сделка знает свой следующий шаг
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400">
              «Сделка» держит в порядке воронку, контакты и задачи команды. Без настроек на неделю: зарегистрировались, пригласили
              коллег, работаете.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={primaryButton}>
                Начать бесплатно
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link to="/login" className={secondaryButton}>
                Войти
              </Link>
            </div>
            <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">Учебный проект с открытым кодом. Данные — ваши, сервер — ваш.</p>
          </div>

          <HeroMock />
        </section>

        {/* Преимущества */}
        <section className="border-y border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-base font-semibold">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Как это выглядит */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Как это выглядит</h2>
            <p className="mt-3 text-base text-stone-600 dark:text-stone-400">
              Три раздела, которые нужны каждый день. Никаких отчётов ради отчётов.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <ShowcaseCard title="Сегодня" caption="Личный список: что просрочено, что на сегодня, где нет следующего шага.">
              <TodayMock />
            </ShowcaseCard>
            <ShowcaseCard title="Сделки" caption="Канбан по вашим стадиям. Красная рамка — задача просрочена.">
              <BoardMock compact />
            </ShowcaseCard>
            <ShowcaseCard title="Контакты" caption="Люди и компании с историей общения и связанными сделками.">
              <ContactsMock />
            </ShowcaseCard>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Первая сделка через минуту</h2>
              <p className="mt-2 text-base text-stone-600 dark:text-stone-400">
                Регистрация, название организации, валюта — и вы на рабочем столе. Демо-данные подскажут, как всё устроено.
              </p>
            </div>
            <Link to="/register" className={`${primaryButton} shrink-0`}>
              Создать организацию
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-xs text-stone-400 sm:px-6 dark:text-stone-500">
        <Logo size="sm" />
        <span>FastAPI · React · PostgreSQL · Docker</span>
      </footer>
    </div>
  )
}

/* ---------- Мини-макеты интерфейса из div'ов: без растровых картинок ---------- */

function ShowcaseCard({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950">
        <div className="flex items-center gap-1.5 border-b border-stone-100 px-3 py-2 dark:border-stone-800">
          <span className="size-2 rounded-full bg-stone-200 dark:bg-stone-700" />
          <span className="size-2 rounded-full bg-stone-200 dark:bg-stone-700" />
          <span className="size-2 rounded-full bg-stone-200 dark:bg-stone-700" />
          <span className="ml-2 text-[10px] font-semibold text-stone-400">{title}</span>
        </div>
        <div className="p-3">{children}</div>
      </div>
      <figcaption className="mt-3 text-sm text-stone-500 dark:text-stone-400">{caption}</figcaption>
    </figure>
  )
}

function Line({ w = 'w-24', tone = 'bg-stone-200 dark:bg-stone-700' }: { w?: string; tone?: string }) {
  return <span className={`block h-1.5 rounded-full ${w} ${tone}`} />
}

function MockCard({ overdue, done }: { overdue?: boolean; done?: boolean }) {
  return (
    <div
      className={[
        'rounded-md border bg-white p-2 dark:bg-stone-900',
        overdue ? 'border-red-200 dark:border-red-900' : 'border-stone-200 dark:border-stone-800',
        done ? 'opacity-60' : '',
      ].join(' ')}
    >
      <Line w="w-3/4" tone="bg-stone-800 dark:bg-stone-200" />
      <div className="mt-1.5">
        <Line w="w-1/2" />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Line w="w-10" tone={overdue ? 'bg-red-300 dark:bg-red-800' : 'bg-stone-300 dark:bg-stone-600'} />
        <span className="size-3.5 rounded-full bg-stone-200 dark:bg-stone-700" />
      </div>
    </div>
  )
}

function BoardMock({ compact = false }: { compact?: boolean }) {
  const columns: Array<{ cards: Array<{ overdue?: boolean; done?: boolean }> }> = [
    { cards: [{}, { overdue: true }] },
    { cards: [{}, {}, {}] },
    { cards: [{ overdue: true }] },
    { cards: [{ done: true }, { done: true }] },
  ]
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-4'}`}>
      {columns.slice(0, compact ? 3 : 4).map((column, index) => (
        <div key={index} className="rounded-lg bg-stone-100/80 p-1.5 dark:bg-stone-900/60">
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <Line w="w-10" tone="bg-stone-400 dark:bg-stone-500" />
            <span className="text-[9px] tabular-nums text-stone-400">{column.cards.length}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {column.cards.map((card, cardIndex) => (
              <MockCard key={cardIndex} {...card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function HeroMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-stone-200/60 to-transparent blur-2xl dark:from-stone-800/60" />
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-800 dark:bg-stone-950">
        <div className="flex">
          <aside className="hidden w-28 shrink-0 border-r border-stone-100 p-2.5 sm:block dark:border-stone-800">
            <div className="flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded bg-brand-600 text-[7px] font-bold text-white dark:bg-brand-500 dark:text-white">S</span>
              <Line w="w-10" tone="bg-stone-800 dark:bg-stone-200" />
            </div>
            <div className="mt-3 h-4 rounded border border-stone-200 dark:border-stone-800" />
            <div className="mt-1.5 h-4 rounded bg-brand-600 dark:bg-brand-400" />
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between rounded bg-stone-100 px-1.5 py-1 dark:bg-stone-800">
                <Line w="w-8" tone="bg-stone-700 dark:bg-stone-300" />
                <span className="size-2.5 rounded-full bg-red-500" />
              </div>
              <div className="px-1.5 py-1"><Line w="w-8" /></div>
              <div className="px-1.5 py-1"><Line w="w-10" /></div>
            </div>
          </aside>
          <div className="min-w-0 flex-1 p-3">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold">Сделки</span>
              <span className="font-mono text-[10px] text-stone-400">13 · 3 165 700 ₽</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <div className="h-4 w-20 rounded border border-stone-200 dark:border-stone-800" />
              <div className="h-4 w-16 rounded border border-stone-200 dark:border-stone-800" />
              <div className="ml-auto h-4 w-14 rounded bg-brand-600 dark:bg-brand-400" />
            </div>
            <div className="mt-3">
              <LiveBoardMock />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TodayMock() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="text-[9px] font-semibold tracking-wider text-red-600 uppercase">Просрочено · 2</span>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-red-200 bg-white p-2 dark:border-red-900 dark:bg-stone-900">
              <span className="size-3 rounded border border-stone-300 dark:border-stone-600" />
              <div className="flex-1"><Line w={i ? 'w-2/3' : 'w-5/6'} tone="bg-stone-800 dark:bg-stone-200" /></div>
              <Line w="w-8" tone="bg-red-300 dark:bg-red-800" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <span className="text-[9px] font-semibold tracking-wider text-stone-500 uppercase">На сегодня · 3</span>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900">
              <span className={`size-3 rounded border ${i === 0 ? 'border-stone-800 bg-stone-800 dark:border-stone-200 dark:bg-stone-200' : 'border-stone-300 dark:border-stone-600'}`} />
              <div className="flex-1"><Line w={['w-3/4', 'w-1/2', 'w-2/3'][i]} tone={i === 0 ? 'bg-stone-300 dark:bg-stone-600' : 'bg-stone-800 dark:bg-stone-200'} /></div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <span className="text-[9px] font-semibold tracking-wider text-amber-600 uppercase">Без следующего шага · 1</span>
        <div className="mt-1.5 flex items-center gap-2 rounded-md border border-dashed border-amber-300 p-2 dark:border-amber-800">
          <div className="flex-1"><Line w="w-2/3" tone="bg-stone-800 dark:bg-stone-200" /></div>
          <div className="h-4 w-12 rounded bg-brand-600 dark:bg-brand-400" />
        </div>
      </div>
    </div>
  )
}

function ContactsMock() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-1 flex gap-1">
        <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[9px] font-medium text-white dark:bg-brand-500 dark:text-white">Контакты 14</span>
        <span className="rounded px-1.5 py-0.5 text-[9px] text-stone-400">Компании 12</span>
      </div>
      {['ИП', 'ЕШ', 'ТА', 'ОК', 'СД'].map((initials, i) => (
        <div key={initials} className="flex items-center gap-2 rounded-md border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[8px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {initials}
          </span>
          <div className="flex-1">
            <Line w={['w-2/3', 'w-1/2', 'w-3/5', 'w-1/2', 'w-2/3'][i]} tone="bg-stone-800 dark:bg-stone-200" />
            <div className="mt-1"><Line w="w-1/3" /></div>
          </div>
          <Line w="w-10" tone="bg-stone-300 dark:bg-stone-600" />
        </div>
      ))}
    </div>
  )
}
