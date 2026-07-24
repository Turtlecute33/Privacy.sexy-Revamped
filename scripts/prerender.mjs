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
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: READY_TIMEOUT_MS });
    // The app removes the splash screen once it has mounted (the `app-ready` event).
    await page.waitForFunction(
      () => !document.getElementById('splash-screen') && !!document.querySelector('#main-content'),
      { timeout: READY_TIMEOUT_MS },
    );
    const html = await page.content();
    if (!html.includes('id="main-content"')) {
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
