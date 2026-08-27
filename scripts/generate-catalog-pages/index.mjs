/*
 * Build-time generation of the static catalog and article pages, plus the sitemap.
 *
 * Why static HTML written into `dist-web` rather than routes in the SPA: GitHub Pages has no
 * rewrite rules, so client-side routing needs the `404.html` trick — and that serves an HTTP 404
 * status before any JavaScript runs, which is what a crawler records. A real directory with an
 * `index.html` answers 200. These pages also carry no JavaScript at all, so they do not inherit the
 * app's mount cost.
 *
 * Runs after `vite build` (which empties the output directory) and is independent of
 * `scripts/prerender.mjs`, which only rewrites the app's own index.html.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import distDirs from '../../dist-dirs.json' with { type: 'json' };
import { OPERATING_SYSTEMS, readCollection } from './collection-reader.mjs';
import { renderAlternativesPage, renderCollectionPage } from './pages.mjs';
import { SITE_ORIGIN } from './layout.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const DIST_DIR = resolve(ROOT, distDirs.web);
const COLLECTIONS_DIR = join(ROOT, 'src/application/collections');

/*
 * The app's own index.html is prerendered separately and its `lastmod` should track the deploy, so
 * take the date from the build rather than committing a date that silently goes stale. Passed in by
 * the caller in tests; defaults to now.
 */
function today(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function renderSitemap(paths, lastModified) {
  const entries = paths.map((path) => `  <url>
    <loc>${SITE_ORIGIN}${path}</loc>
    <lastmod>${lastModified}</lastmod>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

async function writePage(path, html) {
  const directory = join(DIST_DIR, path);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), html, 'utf8');
  return Buffer.byteLength(html);
}

async function generate() {
  if (!existsSync(join(DIST_DIR, 'index.html'))) {
    throw new Error(`Build output not found in ${DIST_DIR}. Run \`npm run build\` first.`);
  }
  const collections = [];
  for (const operatingSystem of OPERATING_SYSTEMS) {
    collections.push(await readCollection(COLLECTIONS_DIR, operatingSystem));
  }
  const pages = [
    ...collections.map((collection) => renderCollectionPage(collection)),
    renderAlternativesPage(collections),
  ];
  for (const page of pages) {
    const bytes = await writePage(page.path, page.html);
    console.log(`Wrote ${page.path.padEnd(30)} ${(bytes / 1024).toFixed(0)} KB`);
  }
  const sitemapPaths = ['/', ...pages.map((page) => page.path)];
  await writeFile(join(DIST_DIR, 'sitemap.xml'), renderSitemap(sitemapPaths, today()), 'utf8');
  console.log(`Wrote /sitemap.xml with ${sitemapPaths.length} URLs.`);
  const totalScripts = collections.reduce((sum, collection) => sum + collection.totalScripts, 0);
  console.log(
    `Indexed ${totalScripts} scripts: `
    + `${collections.map((c) => `${c.totalScripts} ${c.name}`).join(', ')}.`,
  );
}

generate().catch((error) => {
  console.error('Catalog page generation failed:', error);
  process.exit(1);
});
