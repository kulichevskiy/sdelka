#!/usr/bin/env node
/**
 * Генератор цветовой гаммы продукта.
 *
 *   npm run palette -- 52489C                 # оттенки + подсказки акцентов
 *   npm run palette -- 52489C EBEBEB          # бренд + нейтраль
 *   npm run palette -- https://coolors.co/52489c-ebebeb-f4a261
 *   npm run palette -- 52489C --apply         # записать в src/index.css (@theme)
 *   npm run palette -- 52489C --preview       # HTML-превью в scripts/palette-preview.html
 *
 * Первый цвет — бренд (шаг 600), второй — нейтраль (шаг 200), остальные из
 * ссылки coolors выводятся как готовые акценты. Подсказки гармоний (дополнительный,
 * аналоговые, триада) печатаются ссылкой на coolors.co, чтобы покрутить их там.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
// Целевые светлоты шкалы — как у Tailwind: 50 почти белый, 950 почти чёрный
const LIGHTNESS = { 50: 97, 100: 93, 200: 86, 300: 76, 400: 64, 500: 53, 600: null, 700: 36, 800: 29, 900: 23, 950: 14 }

// ---------- цвет ----------
function parseHex(input) {
  const hex = input.replace(/^#/, '').trim()
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error(`Не похоже на HEX: ${input}`)
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
}
const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  const l = (max + min) / 2
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  return [((h * 60) + 360) % 360, s * 100, l * 100]
}
function hslToRgb([h, s, l]) {
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/** Шкала оттенков: тон сохраняем, насыщенность плавно гасим к краям, чтобы 50 и 950 не «звенели» */
function scale(baseHex, baseStep = 600) {
  const [h, s, l] = rgbToHsl(parseHex(baseHex))
  const result = {}
  for (const step of STEPS) {
    if (step === baseStep) { result[step] = toHex(parseHex(baseHex)); continue }
    const targetL = LIGHTNESS[step] ?? l
    const distance = Math.abs(targetL - l) / 100
    const sat = s * (1 - distance * (targetL > l ? 0.55 : 0.35))
    result[step] = toHex(hslToRgb([h, sat, targetL]))
  }
  return result
}

/** Нейтраль: почти без насыщенности, шаг 200 — заданный цвет */
function neutralScale(hex) {
  const [h, s, l] = rgbToHsl(parseHex(hex))
  const target = { 50: 97, 100: 95, 200: l, 300: 84, 400: 66, 500: 48, 600: 36, 700: 27, 800: 18, 900: 12, 950: 8 }
  const result = {}
  for (const step of STEPS) result[step] = toHex(hslToRgb([h, Math.min(s, 6), target[step]]))
  return result
}

function harmonies(hex) {
  const [h, s, l] = rgbToHsl(parseHex(hex))
  const at = (dh, ds = 0, dl = 0) => toHex(hslToRgb([(h + dh + 360) % 360, Math.min(100, s + ds), Math.min(90, Math.max(10, l + dl))]))
  return {
    'Дополнительный': [at(180)],
    'Аналоговые': [at(-30), at(30)],
    'Триада': [at(120), at(240)],
    'Расщеплённый дополнительный': [at(150), at(210)],
    'Тёплый акцент (для предупреждений/CTA-2)': [at(180, 10, 15)],
  }
}

const coolorsLink = (colors) => 'https://coolors.co/' + colors.map((c) => c.replace('#', '').toLowerCase()).join('-')

// ---------- ввод ----------
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
let colors = args.filter((a) => !a.startsWith('--'))
if (colors[0]?.includes('coolors.co/')) colors = colors[0].split('coolors.co/')[1].split(/[?#]/)[0].split('-')
if (!colors.length) {
  console.error('Укажите цвет: npm run palette -- 52489C [EBEBEB] [--apply] [--preview]')
  process.exit(1)
}
const [brandHex, neutralHex, ...accents] = colors
const brand = scale(brandHex)
const neutral = neutralHex ? neutralScale(neutralHex) : null

// ---------- вывод ----------
const printScale = (name, sc) => {
  console.log(`\n${name}`)
  for (const step of STEPS) console.log(`  ${String(step).padStart(3)}  ${sc[step]}`)
}
printScale('brand', brand)
if (neutral) printScale('stone (нейтраль)', neutral)
if (accents.length) console.log('\nАкценты из ссылки:', accents.map((a) => '#' + a).join(', '))

console.log('\nПодсказки гармоний к бренду:')
const all = [toHex(parseHex(brandHex))]
for (const [name, list] of Object.entries(harmonies(brandHex))) {
  console.log(`  ${name}: ${list.join(', ')}`)
  all.push(...list)
}
console.log(`\nПосмотреть и покрутить в coolors: ${coolorsLink(all)}`)

// ---------- запись ----------
const here = path.dirname(fileURLToPath(import.meta.url))
if (flags.has('--apply')) {
  const cssPath = path.join(here, '..', 'src', 'index.css')
  let css = readFileSync(cssPath, 'utf8')
  const block = (name, sc) => STEPS.map((s) => `  --color-${name}-${s}: ${sc[s]};`).join('\n')
  css = css.replace(/  --color-brand-50:[\s\S]*?--color-brand-950: #[0-9a-f]{6};/i, block('brand', brand))
  if (neutral) css = css.replace(/  --color-stone-50:[\s\S]*?--color-stone-950: #[0-9a-f]{6};/i, block('stone', neutral))
  writeFileSync(cssPath, css)
  console.log(`\nЗаписано в ${path.relative(process.cwd(), cssPath)}`)
}

if (flags.has('--preview')) {
  const swatches = (name, sc) => `<h2>${name}</h2><div class="row">${STEPS.map((s) => `<div class="sw" style="background:${sc[s]}"><b>${s}</b><span>${sc[s]}</span></div>`).join('')}</div>`
  const html = `<!doctype html><meta charset="utf-8"><title>Палитра</title>
<style>body{font:14px system-ui;margin:24px;background:#fff;color:#111}.row{display:flex;gap:4px;margin-bottom:24px}.sw{flex:1;height:88px;border-radius:8px;display:flex;flex-direction:column;justify-content:flex-end;padding:8px;color:#fff;text-shadow:0 0 4px rgba(0,0,0,.6);font-size:11px}
.demo{display:flex;gap:12px;align-items:center;margin-top:16px}.btn{background:${brand[600]};color:#fff;padding:10px 16px;border-radius:8px;border:0;font-weight:600}.btn2{background:${brand[50]};color:${brand[700]};padding:10px 16px;border-radius:8px}</style>
${swatches('brand', brand)}${neutral ? swatches('stone', neutral) : ''}
<h2>Гармонии</h2><div class="row">${all.map((c) => `<div class="sw" style="background:${c}"><span>${c}</span></div>`).join('')}</div>
<div class="demo"><button class="btn">Создать сделку</button><span class="btn2">Активный пункт</span><a href="${coolorsLink(all)}">Открыть в coolors</a></div>`
  const out = path.join(here, 'palette-preview.html')
  writeFileSync(out, html)
  console.log(`Превью: ${path.relative(process.cwd(), out)}`)
}
