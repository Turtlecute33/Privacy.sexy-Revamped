/*
 * Build-time prerendering for SEO.
 *
 * privacy.sexy Revamped ships as a client-rendered Vue SPA, so crawlers and
 * social/AI scrapers that do not execute JavaScript see an empty <div id="app">.
 * This script serves the freshly built site over HTTP, loads it in headless
 * Chrome, waits until the app has finished mounting, then writes the fully
 * rendered HTML back over index.html. The client still boots normally: Vue's
 * runtime-dom mount clears #app before mounting, so there is no duplicate DOM.
 *
 * Local runs use the system Chrome via PUPPETEER_EXECUTABLE_PATH; CI uses the
 * Chromium that puppeteer downloads during `npm ci`.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import distDirs from '../dist-dirs.json' with { type: 'json' };

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST_DIR = resolve(ROOT, distDirs.web);
const INDEX_FILE = join(DIST_DIR, 'index.html');
const PORT = Number(process.env.PRERENDER_PORT ?? 4319);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const READY_TIMEOUT_MS = 60_000;
const APP_CONTENT_SELECTOR = '#app .app__wrapper';

/*
 * The app opens on the operating system it detects from `navigator.userAgent`, so without
 * pinning one here the snapshot would show whichever OS the build machine runs — the Linux
 * collection on CI, macOS on a developer's Mac. That makes the indexed HTML depend on the
 * runner image, and hides the Windows collection, which is the largest one and the one the
 * page's own keywords target, from crawlers that do not execute JavaScript.
 */
const PRERENDER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PRERENDERED_OPERATING_SYSTEM = 'Windows';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.map': 'application/json',
};

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, ORIGIN);
      let filePath = join(DIST_DIR, decodeURIComponent(pathname));
      if (!filePath.startsWith(DIST_DIR)) { // path traversal guard
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      if (!existsSync(filePath) || (await stat(filePath)).isDirectory()) {
        filePath = INDEX_FILE; // SPA fallback
      }
      const data = await readFile(filePath);
      res.setHeader('Content-Type', MIME[extname(filePath)] ?? 'application/octet-stream');
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  await new Promise((res) => { server.listen(PORT, '127.0.0.1', res); });
  return server;
}

/*
 * Pinning the user agent only works for as long as the app keeps deriving its initial
 * operating system from it, so read the choice back off the rendered page rather than
 * trusting it. A silent fallback here would ship a snapshot of the wrong collection.
 */
async function assertPrerenderedOperatingSystem(page) {
  const selectedOperatingSystem = await page.evaluate(() => {
    const group = [...document.querySelectorAll('[role="group"][aria-labelledby]')].find(
      (element) => document
        .getElementById(element.getAttribute('aria-labelledby'))
        ?.textContent
        ?.trim() === 'System:',
    );
    return group?.querySelector('[aria-pressed="true"]')?.textContent?.trim();
  });
  if (selectedOperatingSystem !== PRERENDERED_OPERATING_SYSTEM) {
    throw new Error(
      `Expected the prerendered page to show the ${PRERENDERED_OPERATING_SYSTEM} collection, `
      + `but it shows "${selectedOperatingSystem ?? 'nothing recognizable'}".`,
    );
  }
  console.log(`Prerendering the ${PRERENDERED_OPERATING_SYSTEM} collection.`);
}

/*
 * Vite's dynamic-import helper appends a `<link rel="modulepreload">` to the live document
 * for every chunk it loads. Capturing the page after mount therefore bakes preloads for
 * lazily-loaded chunks (notably the ~470 KB Ace editor) into the static HTML, which makes
 * the browser fetch them at high priority before the first paint on every cold load.
 * Only the preloads the build itself emitted belong in the shipped HTML.
 */
async function stripRuntimeInjectedPreloads(page, builtHtml) {
  const buildEmittedPreloads = [...builtHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]*>/g)]
    .map(([tag]) => tag.match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);
  const removedCount = await page.evaluate((allowedHrefs) => {
    const links = [...document.querySelectorAll('link[rel="modulepreload"]')]
      .filter((link) => !allowedHrefs.includes(link.getAttribute('href')));
    links.forEach((link) => link.remove());
    return links.length;
  }, buildEmittedPreloads);
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} runtime-injected modulepreload link(s).`);
  }
}

async function prerender() {
  if (!existsSync(INDEX_FILE)) {
    throw new Error(`Build output not found at ${INDEX_FILE}. Run the build first.`);
  }
  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(PRERENDER_USER_AGENT);
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: READY_TIMEOUT_MS });
    // The app removes the splash screen once it has mounted (the `app-ready` event).
    await page.waitForFunction(
      (appContentSelector) => (
        !document.getElementById('splash-screen')
        && !!document.querySelector(appContentSelector)
      ),
      { timeout: READY_TIMEOUT_MS },
      APP_CONTENT_SELECTOR,
    );
    await assertPrerenderedOperatingSystem(page);
    await stripRuntimeInjectedPreloads(page, await readFile(INDEX_FILE, 'utf8'));
    const html = await page.content();
    if (!html.includes('app__wrapper')) {
      throw new Error('Prerendered HTML is missing app content; aborting to avoid deploying an empty page.');
    }
    await writeFile(INDEX_FILE, html, 'utf8');
    const kb = Math.round(Buffer.byteLength(html) / 1024);
    console.log(`Prerendered index.html written (${kb} KB).`);
  } finally {
    await browser.close();
    await new Promise((res) => server.close(res));
  }
}

prerender().catch((error) => {
  console.error('Prerender failed:', error);
  process.exit(1);
});
