import { chromium } from 'playwright-core'

const BASE = 'http://127.0.0.1:4173'
const browser = await chromium.launch({
  executablePath: '/home/siva/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 })
const fails = []
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
  if (!ok) fails.push(name)
}

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)

// --- command palette ---
await page.keyboard.press('Control+k')
await page.waitForTimeout(350)
check('palette opens on ⌘K', await page.locator('dialog.palette[open]').isVisible())
await page.screenshot({ path: 'screenshots/state-palette.png' })
await page.locator('.palette__input').fill('ener')
await page.waitForTimeout(200)
const first = await page.locator('.palette__item[aria-selected="true"] .palette__label').textContent()
check('palette filters to Energy', first?.trim() === 'Energy', `selected: ${first}`)
await page.keyboard.press('Enter')
await page.waitForTimeout(700)
check('palette navigates', new URL(page.url()).pathname === '/energy')

// --- property switch ---
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.locator('.prop', { hasText: 'Meridian Crest' }).click()
await page.waitForTimeout(900)
const h1 = await page.locator('h1').textContent()
check('switching property re-renders the record', /Meridian Crest/.test(h1 ?? ''), h1?.trim())
const band = await page.locator('.stamp__band').textContent()
check('condo has its own band', band?.trim() === 'E', `band ${band}`)
await page.screenshot({ path: 'screenshots/state-condo.png' })

// --- preference persistence ---
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const afterReload = await page.locator('h1').textContent()
check('active property persists across reload', /Meridian Crest/.test(afterReload ?? ''))

// --- report flow ---
await page.locator('.prop', { hasText: 'Blk 456' }).click()
await page.waitForTimeout(600)
await page.getByRole('button', { name: 'Report an issue' }).click()
await page.waitForTimeout(500)
check('report sheet opens', await page.locator('dialog.sheet[open]').isVisible())

await page.locator('#issue-title').fill('Water seeping through the kitchen ceiling')
await page.locator('#issue-body').fill('A damp patch has spread across the kitchen ceiling since Monday and the paint is bubbling.')
await page.waitForTimeout(300)
const routing = await page.locator('.sheet__body .note--warn .eyebrow, .sheet__body .note--bad .eyebrow').first().textContent()
check('routing preview names HDB', /HDB/i.test(routing ?? ''), routing?.trim())
await page.screenshot({ path: 'screenshots/state-report.png' })

await page.getByRole('button', { name: 'File case' }).click()
await page.waitForTimeout(900)
const toastVisible = await page.locator('.toast').first().isVisible()
check('filing a case raises a toast', toastVisible)
check('sheet closes after filing', (await page.locator('dialog.sheet[open]').count()) === 0)

await page.goto(`${BASE}/maintenance`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const cases = await page.locator('.case__title').allTextContents()
check('filed case appears in the board', cases.some((c) => /seeping through the kitchen/i.test(c)), cases[0])

// --- density toggle ---
await page.getByRole('button', { name: /Comfortable|Compact/ }).click()
await page.waitForTimeout(300)
const density = await page.evaluate(() => document.documentElement.dataset.density)
check('density toggle applies', density === 'compact', `data-density=${density}`)
await page.reload({ waitUntil: 'networkidle' })
const densityAfter = await page.evaluate(() => document.documentElement.dataset.density)
check('density persists', densityAfter === 'compact')

// --- keyboard: escape closes the sheet ---
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Report an issue' }).click()
await page.waitForTimeout(400)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
check('Escape closes the sheet', (await page.locator('dialog.sheet[open]').count()) === 0)

console.log(`\n${fails.length === 0 ? 'all interaction checks passed' : `FAILURES: ${fails.join(', ')}`}`)
await browser.close()
process.exit(fails.length ? 1 : 0)
