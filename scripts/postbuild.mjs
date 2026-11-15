import { copyFile, mkdir, writeFile } from 'node:fs/promises'

/**
 * Static-host support for a client-routed SPA.
 *
 * GitHub Pages has no rewrite rules, so by default a deep link like
 * /tenure/retrofit is answered by 404.html. That renders, but it answers with a
 * 404 status, which is wrong for a page that exists.
 *
 * Two steps fix it properly:
 *
 *  1. prerender one directory index per route, so /tenure/retrofit/ is served
 *     as a real 200 document (Pages redirects /tenure/retrofit → …/retrofit/);
 *  2. keep 404.html as the shell, so any unmatched path still boots the router
 *     instead of showing a host error page.
 */
const ROUTES = ['energy', 'retrofit', 'maintenance', 'telemetry', 'programmes']
const ORIGIN = 'https://siva-sub.github.io/tenure/'

for (const route of ROUTES) {
  await mkdir(`dist/${route}`, { recursive: true })
  await copyFile('dist/index.html', `dist/${route}/index.html`)
}

await copyFile('dist/index.html', 'dist/404.html')

const urls = ['', ...ROUTES.map((r) => `${r}/`)]
await writeFile(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>
`,
)

console.log(`postbuild: ${ROUTES.length} route shells + 404.html + sitemap.xml written`)
