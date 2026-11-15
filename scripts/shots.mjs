import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'

const EXE = '/home/siva/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome'
const BASE = process.env.BASE ?? 'http://127.0.0.1:4173'
const OUT = 'screenshots'

const ROUTES = [
  ['record', '/'],
  ['energy', '/energy'],
  ['retrofit', '/retrofit'],
  ['maintenance', '/maintenance'],
  ['telemetry', '/telemetry'],
  ['programmes', '/programmes'],
]

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
})

const problems = []

async function session(name, viewport, routes, opts = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    reducedMotion: opts.reducedMotion ?? 'no-preference',
    colorScheme: 'light',
  })
  const page = await context.newPage()

  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`[${name}] console: ${msg.text()}`)
  })
  page.on('pageerror', (err) => problems.push(`[${name}] pageerror: ${err.message}`))
  page.on('requestfailed', (req) => {
    const url = req.url()
    if (!url.includes('fonts.gstatic')) problems.push(`[${name}] requestfailed: ${url}`)
  })

  for (const [label, path] of routes) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    // Scroll the way a reader would so scroll-reveals fire before capture.
    if (opts.fullPage) {
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.7
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 110))
        }
        window.scrollTo(0, 0)
      })
    }
    await page.waitForTimeout(1100)
    await page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: opts.fullPage ?? false })

    // Layout audit: horizontal overflow and elements escaping the viewport.
    const audit = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth
      const overflow = [...document.querySelectorAll('section, div, table, article, header, aside')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.right > docWidth + 2
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} right=${Math.round(el.getBoundingClientRect().right)}`)
      return {
        docWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflow,
        h1: document.querySelector('h1')?.textContent?.trim().slice(0, 80) ?? null,
      }
    })
    if (audit.scrollWidth > audit.docWidth + 2) {
      problems.push(`[${name}${path}] horizontal scroll: ${audit.scrollWidth} > ${audit.docWidth}; ${audit.overflow.join(' | ')}`)
    }
    console.log(`${name}${path} → h1: ${audit.h1}`)
  }

  await context.close()
}

await session('desk', { width: 1440, height: 940 }, ROUTES)
await session('mob', { width: 390, height: 844 }, [['record', '/'], ['telemetry', '/telemetry'], ['retrofit', '/retrofit']])
await session('reduce', { width: 1280, height: 900 }, [['record', '/']], { reducedMotion: 'reduce' })
await session('full', { width: 1440, height: 940 }, [['record', '/']], { fullPage: true })

await browser.close()

console.log('\n--- problems ---')
console.log(problems.length ? problems.join('\n') : 'none')
