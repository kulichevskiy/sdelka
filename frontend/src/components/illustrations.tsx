/**
 * Иллюстрации для пустых состояний: простые линии в текущем цвете (currentColor),
 * поэтому в тёмной теме они темнеют вместе с текстом.
 */
const common = {
  width: 128,
  height: 96,
  viewBox: '0 0 128 96',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Канбан с пустыми колонками */
export function BoardIllustration() {
  return (
    <svg {...common}>
      <rect x="8" y="12" width="32" height="72" rx="6" />
      <rect x="48" y="12" width="32" height="72" rx="6" />
      <rect x="88" y="12" width="32" height="72" rx="6" />
      <rect x="14" y="22" width="20" height="14" rx="3" strokeDasharray="3 3" />
      <rect x="54" y="22" width="20" height="14" rx="3" strokeDasharray="3 3" />
      <rect x="94" y="22" width="20" height="14" rx="3" strokeDasharray="3 3" />
      <path d="M18 60h12M58 60h12M98 60h12" strokeDasharray="2 3" />
    </svg>
  )
}

/** Чашка кофе: всё сделано */
export function CoffeeIllustration() {
  return (
    <svg {...common}>
      <path d="M32 40h56v22a18 18 0 0 1-18 18H50a18 18 0 0 1-18-18V40z" />
      <path d="M88 46h8a10 10 0 0 1 0 20h-8" />
      <path d="M28 88h68" />
      <path d="M50 30c0-6 4-6 4-12M62 30c0-6 4-6 4-12M74 30c0-6 4-6 4-12" strokeDasharray="2 3" />
    </svg>
  )
}

/** Календарь с галочкой: задач нет, потому что нечего делать */
export function CalendarIllustration() {
  return (
    <svg {...common}>
      <rect x="20" y="18" width="88" height="66" rx="8" />
      <path d="M20 36h88M40 10v14M88 10v14" />
      <path d="M50 60l9 9 20-20" />
    </svg>
  )
}

/** Люди: контакты */
export function PeopleIllustration() {
  return (
    <svg {...common}>
      <circle cx="46" cy="34" r="12" />
      <path d="M22 82c0-14 11-24 24-24s24 10 24 24" />
      <circle cx="86" cy="40" r="9" strokeDasharray="3 3" />
      <path d="M72 82c0-10 6-18 14-18s14 8 14 18" strokeDasharray="3 3" />
    </svg>
  )
}

/** Здания: компании */
export function BuildingsIllustration() {
  return (
    <svg {...common}>
      <path d="M16 84V32l24-10v62M40 84V44l28-8v48M68 84V56l30-6v34" />
      <path d="M8 84h112" />
      <path d="M24 42h6M24 54h6M24 66h6M50 52h6M50 64h6M80 66h6M80 76h6" strokeDasharray="1 3" />
    </svg>
  )
}

/** Ящик: настроек пока нет */
export function BoxIllustration() {
  return (
    <svg {...common}>
      <path d="M20 40l44-20 44 20v36L64 84 20 76V40z" />
      <path d="M20 40l44 18 44-18M64 58v26" />
      <path d="M44 30l40 18" strokeDasharray="3 3" />
    </svg>
  )
}

/** Лупа: поиск не нашёл */
export function SearchIllustration() {
  return (
    <svg {...common}>
      <circle cx="54" cy="44" r="24" />
      <path d="M72 62l24 24" />
      <path d="M44 44h20M54 34v20" strokeDasharray="2 3" />
    </svg>
  )
}
