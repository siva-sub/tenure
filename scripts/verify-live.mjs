import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const BASE = 'https://siva-sub.github.io/tenure'
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const browser = await chromium.launch({
  executablePath: '/home/siva/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 })
const fails = []
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('requestfailed', (r) => errors.push(`requestfailed ${r.url()}`))
// GitHub Pages has no rewrite rules: a deep link is answered by 404.html (the
// app shell) with a 404 status. The router still renders; only asset 404s matter.
const isExpectedDoc404 = (text) => /status of 404/.test(text)
const check = (n, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${extra ? ` — ${extra}` : ''}`); if (!ok) fails.push(n) }

// Root
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(1200)
check('root renders', (await page.locator('h1').textContent())?.includes('Blk 456'))
const fraunces = await page.evaluate(() => document.fonts.check('16px Fraunces'))
check('self-hosted font loaded', fraunces)
await page.screenshot({ path: 'screenshots/live-record.png' })

// Client-side navigation
await page.getByRole('link', { name: 'Energy' }).first().click()
await page.waitForTimeout(1200)
check('in-app navigation works', new URL(page.url()).pathname === '/tenure/energy')
check('energy route renders', (await page.locator('h1').textContent())?.includes('costs to run'))

// Deep link straight into a subpath
await page.goto(`${BASE}/retrofit`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
check('deep link boots the router', (await page.locator('h1').textContent())?.includes('pay for itself'))
await page.screenshot({ path: 'screenshots/live-retrofit.png' })

// Programmes page + all five routes
for (const [route, needle] of [
  ['/', 'Blk 456'], ['/energy', 'costs to run'], ['/retrofit', 'pay for itself'],
  ['/maintenance', 'responsible'], ['/telemetry', 'reading itself'], ['/programmes', 'actual rails'],
]) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  check(`route ${route || '/'}`, (await page.locator('h1').textContent())?.toLowerCase().includes(needle.toLowerCase()))
}

// Accessibility on the live build
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.addScriptTag({ content: AXE })
const axe = await page.evaluate(async () => await window.axe.run(document, {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
}))
check('axe: no serious/critical', axe.violations.filter((v) => ['critical', 'serious'].includes(v.impact)).length === 0)

const realErrors = errors.filter((e) => !isExpectedDoc404(e))
check('no runtime errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))
console.log(`\n${fails.length === 0 ? 'LIVE SITE VERIFIED' : `FAILURES: ${fails.join(', ')}`}`)
await browser.close()
process.exit(fails.length ? 1 : 0)
