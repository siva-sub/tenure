import { copyFile, writeFile } from 'node:fs/promises'

/**
 * GitHub Pages has no rewrite rules: an unknown path returns 404.html. Making
 * that file the application shell means a deep link like /tenure/retrofit boots
 * the router and renders the right page instead of a 404.
 */
await copyFile('dist/index.html', 'dist/404.html')

// A minimal sitemap; the app has five stable routes.
await writeFile(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap"
  <url><loc>https://siva-sub.github.io/tenure/</loc><priority>1.0</priority></url>
</urlset>
`.replace('xmlns="http://www.sitemap"', 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
)
console.log('postbuild: dist/404.html + dist/sitemap.xml written')
