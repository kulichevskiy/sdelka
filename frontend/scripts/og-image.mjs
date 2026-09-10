#!/usr/bin/env node
/**
 * Рендер OG-картинки 1200×630 → public/og.png.
 *   npm run og
 * Использует установленный Google Chrome через playwright-core (channel: chrome).
 */
import { chromium } from 'playwright-core'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pub = path.join(here, '..', 'public')
const font = (f) => `url(data:font/woff2;base64,${readFileSync(path.join(pub, 'fonts', f)).toString('base64')}) format("woff2")`

const card = (title, sub, overdue, done) => `
  <div class="card ${overdue ? 'overdue' : ''}">
    <b>${title}</b><span>${sub}</span>
    <div class="row"><i class="${overdue ? 'red' : ''}"></i>${done ? '<em>✓</em>' : '<i class="dot"></i>'}</div>
  </div>`

const html = `<!doctype html><meta charset="utf-8">
<style>
@font-face{font-family:G;font-weight:400;src:${font('Graphik-Regular-Cy-Web.woff2')}}
@font-face{font-family:G;font-weight:600;src:${font('Graphik-Semibold-Web.woff2')}}
@font-face{font-family:G;font-weight:900;src:${font('Graphik-Black-Cy-Web.woff2')}}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:G,system-ui;background:#f9fafb;color:#1a1d23;position:relative}
.bg{position:absolute;inset:0;background:
  radial-gradient(700px 500px at 100% 0%, rgba(56,112,208,.14), transparent 70%),
  radial-gradient(500px 400px at 0% 100%, rgba(56,112,208,.08), transparent 70%)}
.left{position:absolute;left:72px;top:72px;width:560px}
.logo{display:flex;align-items:center;gap:14px;font-weight:700;font-size:28px;letter-spacing:-.01em}
.logo i{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:10px;background:#3870d0;color:#fff;font-style:normal;font-weight:700;font-size:22px}
.kicker{margin-top:64px;font-size:16px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#6b7280}
h1{margin-top:16px;font-size:64px;line-height:1.02;font-weight:900;letter-spacing:-.03em}
p{margin-top:24px;font-size:24px;line-height:1.35;color:#4b5563}
.url{position:absolute;left:72px;bottom:64px;font-size:22px;font-weight:600;color:#3870d0}
.board{position:absolute;right:-40px;top:96px;width:560px;height:600px;background:#fff;border:1px solid #e5e7eb;border-radius:20px;box-shadow:0 30px 80px -30px rgba(26,29,35,.25);padding:24px;transform:rotate(-3deg)}
.head{display:flex;align-items:baseline;gap:10px;font-weight:700;font-size:18px}
.head span{font-family:ui-monospace,Menlo,monospace;font-weight:400;font-size:13px;color:#9ca3af}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}
.col{background:#f3f4f6;border-radius:12px;padding:10px}
.col h4{font-size:12px;font-weight:600;color:#6b7280;display:flex;justify-content:space-between;padding:0 4px 8px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px}
.card.overdue{border-color:#fecaca}
.card b{display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card span{display:block;font-size:11px;color:#9ca3af;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
.row i{display:block;width:44px;height:6px;border-radius:3px;background:#d1d5db}
.row i.red{background:#fca5a5}
.row .dot{width:14px;height:14px;border-radius:50%}
.row em{width:16px;height:16px;border-radius:50%;background:#d1fae5;color:#059669;font-size:10px;font-style:normal;font-weight:700;display:flex;align-items:center;justify-content:center}
</style>
<div class="bg"></div>
<div class="left">
  <div class="logo"><i>S</i>Сделка</div>
  <div class="kicker">CRM для отделов продаж</div>
  <h1>Каждая сделка знает свой следующий шаг</h1>
  <p>Воронка, контакты и задачи команды в одном месте. Запуск за 5 минут.</p>
</div>
<div class="url">sdelka.app</div>
<div class="board">
  <div class="head">Сделки <span>13 · 3 165 700 ₽</span></div>
  <div class="cols">
    <div class="col"><h4>Квалификация <span>4</span></h4>
      ${card('Модуль склада', 'ООО «Вектор» · 420 000 ₽', true)}
      ${card('Внедрение CRM', 'Северный дом · 180 000 ₽')}
      ${card('Лицензии на год', 'ИП Ершова · 96 000 ₽')}
      ${card('Пилот в 2 филиалах', 'Технолайн · 250 000 ₽')}
    </div>
    <div class="col"><h4>Предложение <span>3</span></h4>
      ${card('Интеграция с 1С', 'Альфа-Строй · 340 000 ₽')}
      ${card('Обучение команды', 'Ромашка · 75 000 ₽', true)}
      ${card('Поддержка 12 мес', 'Гранит · 210 000 ₽')}
    </div>
    <div class="col"><h4>Закрыто <span>2</span></h4>
      ${card('Сайт и CRM', 'Кедр · 560 000 ₽', false, true)}
      ${card('Аудит продаж', 'Орион · 120 000 ₽', false, true)}
    </div>
  </div>
</div>`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)
const out = path.join(pub, 'og.png')
writeFileSync(out, await page.screenshot({ type: 'png' }))
await browser.close()
console.log('→', path.relative(process.cwd(), out))
