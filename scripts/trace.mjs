import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: '/home/siva/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } })
page.on('pageerror', (err) => { console.log('=== PAGEERROR ==='); console.log(err.stack ?? err.message) })
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 600)) })
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await browser.close()
