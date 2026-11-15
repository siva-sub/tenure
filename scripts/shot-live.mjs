import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: '/home/siva/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 })
const BASE = 'https://siva-sub.github.io/tenure'
for (const [name, path] of [['programmes', '/programmes'], ['energy', '/energy']]) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `screenshots/live-${name}.png` })
}
console.log('captured from the live site')
await browser.close()
