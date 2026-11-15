import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const browser = await chromium.launch({ executablePath: '/home/siva/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } })
const seen = new Map()
for (const route of ['/retrofit', '/telemetry']) {
  await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.addScriptTag({ content: AXE })
  const res = await page.evaluate(async () => await window.axe.run(document, { runOnly: ['color-contrast'] }))
  for (const v of res.violations) for (const n of v.nodes) {
    const target = n.target.join(' ')
    const key = target.replace(/:nth-child\(\d+\)/g, '').replace(/\s+/g, ' ')
    const data = n.any[0]?.data ?? {}
    if (!seen.has(key)) seen.set(key, { target, ratio: data.contrastRatio, fg: data.fgColor, bg: data.bgColor, size: data.fontSize })
  }
}
for (const [k, v] of seen) console.log(`${String(v.ratio).padEnd(6)} ${String(v.size).padEnd(7)} ${k.slice(0, 70)}  fg=${v.fg} bg=${v.bg}`)
console.log('unique failing selectors:', seen.size)
await browser.close()
