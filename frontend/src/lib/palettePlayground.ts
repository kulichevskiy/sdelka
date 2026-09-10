/**
 * Живой подбор палитры прямо в приложении.
 *
 * Включается в dev всегда, в проде — параметром `?palette` (запоминается на вкладку).
 * `?primary=52489C` сразу подставляет заданный бренд (и включает режим), `?neutral=EBEBEB` — нейтраль.
 * Tailwind 4 генерирует утилиты через var(--color-brand-*), поэтому достаточно
 * переписать переменные на <html>, и весь интерфейс перекрашивается без пересборки.
 *
 *   Space  — новый случайный бренд
 *   ←/→    — крутить тон текущего бренда на ±10°
 *   ↑/↓    — насыщенность ±8
 *   N      — новый оттенок нейтрали (лёгкий тёплый/холодный подтон)
 *   C      — скопировать блок @theme в буфер
 *   R      — сбросить к цветам из index.css
 *   Esc    — закрыть панель (режим остаётся включён до закрытия вкладки)
 *
 * Логика шкалы совпадает со scripts/palette.mjs: дублируем сознательно, чтобы
 * скрипт оставался запускаемым без сборки.
 */

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
const LIGHTNESS: Record<number, number | null> = { 50: 97, 100: 93, 200: 86, 300: 76, 400: 64, 500: 53, 600: null, 700: 36, 800: 29, 900: 23, 950: 14 }
const FLAG = 'sales-hq-palette-playground'

type Hsl = [number, number, number]

function hexToHsl(hex: string): Hsl | null {
  const clean = hex.replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  const l = (max + min) / 2
  const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  return [(h * 60 + 360) % 360, sat * 100, l * 100]
}

function hslToHex([h, s, l]: Hsl): string {
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
}

function brandScale([h, s, l]: Hsl): Record<number, string> {
  const out: Record<number, string> = {}
  for (const step of STEPS) {
    const target = LIGHTNESS[step]
    if (target === null) { out[step] = hslToHex([h, s, l]); continue }
    const distance = Math.abs(target - l) / 100
    const sat = s * (1 - distance * (target > l ? 0.55 : 0.35))
    out[step] = hslToHex([h, sat, target])
  }
  return out
}

function neutralScale(h: number, s: number): Record<number, string> {
  const target: Record<number, number> = { 50: 97, 100: 95, 200: 92, 300: 84, 400: 66, 500: 48, 600: 36, 700: 27, 800: 18, 900: 12, 950: 8 }
  const out: Record<number, string> = {}
  for (const step of STEPS) out[step] = hslToHex([h, s, target[step]])
  return out
}

function apply(name: string, scale: Record<number, string>) {
  for (const step of STEPS) document.documentElement.style.setProperty(`--color-${name}-${step}`, scale[step])
}

function reset() {
  for (const name of ['brand', 'stone']) for (const step of STEPS) document.documentElement.style.removeProperty(`--color-${name}-${step}`)
}

export function installPalettePlayground() {
  const params = new URLSearchParams(location.search)
  const primaryParam = params.get('primary') && hexToHsl(params.get('primary')!)
  const neutralParam = params.get('neutral') && hexToHsl(params.get('neutral')!)
  if (params.has('palette') || primaryParam || neutralParam) sessionStorage.setItem(FLAG, '1')
  if (!import.meta.env.DEV && !sessionStorage.getItem(FLAG)) return

  // Стартуем от текущего бренда, чтобы стрелки крутили его, а не случайный цвет
  let brand: Hsl = primaryParam || [247, 37, 45]
  let neutral: [number, number] | null = neutralParam ? [neutralParam[0], Math.min(neutralParam[1], 6)] : null
  let visible = true

  const panel = document.createElement('div')
  panel.setAttribute('role', 'status')
  panel.style.cssText =
    'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;background:#111;color:#eee;font:12px/1.4 ui-monospace,Menlo,monospace;padding:10px 14px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.35);display:flex;gap:14px;align-items:center;max-width:calc(100vw - 32px)'
  document.body.appendChild(panel)

  function render(note = '') {
    const scale = brandScale(brand)
    const sw = STEPS.map((s) => `<i style="display:inline-block;width:14px;height:22px;background:${scale[s]}"></i>`).join('')
    const link = 'https://coolors.co/' + [scale[600], scale[300], scale[900]].map((c) => c.slice(1)).join('-')
    panel.innerHTML = `<span style="display:flex;border-radius:4px;overflow:hidden">${sw}</span>
      <b>${scale[600]}</b><span style="opacity:.6">h${Math.round(brand[0])} s${Math.round(brand[1])} l${Math.round(brand[2])}</span>
      ${neutral ? `<span style="opacity:.6">нейтраль h${Math.round(neutral[0])}</span>` : ''}
      <a href="${link}" target="_blank" style="color:#9d95d8">coolors</a>
      <span style="opacity:.5">Space · ←→ тон · ↑↓ насыщ · N нейтраль · C копировать · R сброс · Esc</span>
      ${note ? `<span style="color:#7fd48a">${note}</span>` : ''}`
    panel.style.display = visible ? 'flex' : 'none'
  }

  function commit(note = '') {
    apply('brand', brandScale(brand))
    if (neutral) apply('stone', neutralScale(neutral[0], neutral[1]))
    render(note)
  }

  function themeBlock() {
    const b = brandScale(brand)
    const lines = STEPS.map((s) => `  --color-brand-${s}: ${b[s]};`)
    if (neutral) {
      const n = neutralScale(neutral[0], neutral[1])
      lines.push('', ...STEPS.map((s) => `  --color-stone-${s}: ${n[s]};`))
    }
    return lines.join('\n')
  }

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null
    // Не перехватываем печать в полях
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    if (event.metaKey || event.ctrlKey || event.altKey) return

    switch (event.code) {
      case 'Space':
        event.preventDefault()
        brand = [Math.floor(Math.random() * 360), 30 + Math.random() * 45, 38 + Math.random() * 14]
        visible = true
        commit()
        break
      case 'ArrowLeft': case 'ArrowRight':
        event.preventDefault()
        brand = [(brand[0] + (event.code === 'ArrowRight' ? 10 : -10) + 360) % 360, brand[1], brand[2]]
        commit()
        break
      case 'ArrowUp': case 'ArrowDown':
        event.preventDefault()
        brand = [brand[0], Math.max(5, Math.min(95, brand[1] + (event.code === 'ArrowUp' ? 8 : -8))), brand[2]]
        commit()
        break
      case 'KeyN':
        neutral = [Math.floor(Math.random() * 360), 2 + Math.random() * 6]
        commit()
        break
      case 'KeyC':
        navigator.clipboard?.writeText(themeBlock()).then(() => render('скопировано в буфер'))
        break
      case 'KeyR':
        reset()
        brand = [247, 37, 45]
        neutral = null
        render('сброшено')
        break
      case 'Escape':
        visible = false
        render()
        break
    }
  })

  // Цвет из адреса применяем сразу, а не ждём первого нажатия
  if (primaryParam || neutralParam) commit('из адреса')
  else render()
}
