import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const EXE = '/home/siva/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'
const ROUTES = ['/', '/energy', '/retrofit', '/maintenance', '/telemetry', '/programmes']

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } })

let total = 0
for (const route of ROUTES) {
  await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.addScriptTag({ content: AXE })
  const results = await page.evaluate(async () =>
    await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }),
  )
  const violations = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact))
  total += violations.length
  if (violations.length === 0) {
    console.log(`${route.padEnd(14)} clean (${results.passes.length} passes)`)
  } else {
    for (const v of violations) {
      console.log(`${route.padEnd(14)} ${v.impact.toUpperCase()} ${v.id}: ${v.nodes.length} node(s) — ${v.help}`)
      for (const node of v.nodes.slice(0, 3)) console.log(`   ${node.target.join(' ')}`)
    }
  }
}
console.log(`\nserious+critical violations: ${total}`)
await browser.close()
