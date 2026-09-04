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
 * pinning one here the snapshot would show whichever OS the build machine runs: the Linux
 * collection on CI, macOS on a developer's Mac. That makes the indexed HTML depend on the
 * runner image, and hides the Windows collection, which is the largest one and the one the
 * page's own keywords target, from crawlers that do not execute JavaScript.
 */
const PRERENDER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PRERENDERED_OPERATING_SYSTEM = 'Windows';

const CODE_EDITOR_SELECTOR = '#codeEditor';

/*
 * A sentence from the generated default script. The code pane is only ~320 px wide even at the
 * 1280 px prerender viewport, so the editor soft-wraps every long line into three or four rendered
 * rows, each its own element — which is why the phrase is matched against the tag-stripped text
 * rather than the raw HTML, and why it stops short of the trailing period, which the editor pushes
 * onto a row of its own.
 */
const PRERENDERED_SCRIPT_PHRASE = 'Start by exploring different categories '
  + 'and choosing different tweaks';

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
 * The code editor no longer loads itself on mount: its ~470 KB chunk is fetched only once the pane
 * approaches the viewport or the visitor interacts, which keeps it off the cold-load critical path.
 * A headless capture does neither on its own, so waiting for mount alone would snapshot an empty
 * placeholder box. That loses the generated script — the only real content in the right-hand pane,
 * and a chunk of the copy crawlers and AI scrapers extract — and it silently turns
 * `stripRuntimeInjectedStyles()` and `stripRuntimeInjectedFontProbes()` into no-ops, because there
 * would be no Ace CSS or measurement probes in the document to strip. Scrolling the pane into view
 * is what arms its IntersectionObserver; scrolling back afterwards keeps the snapshot in the state
 * a first-time visitor sees.
 */
async function renderCodeEditor(page) {
  await page.evaluate((selector) => {
    document.querySelector(selector)?.scrollIntoView();
  }, CODE_EDITOR_SELECTOR);
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.classList.contains('ace_editor'),
    { timeout: READY_TIMEOUT_MS },
    CODE_EDITOR_SELECTOR,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
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

/*
 * Ace injects its theme and editor stylesheets straight into `document.head` when the code
 * editor chunk loads, so capturing the page after mount bakes ~36 KB of Ace CSS into the
 * static HTML. Ace re-injects the same CSS at runtime when it actually loads, so the baked
 * copy is dead weight on every cold load. Anything the build did not emit is runtime-injected
 * and does not belong in the shipped HTML.
 */
async function stripRuntimeInjectedStyles(page, builtHtml) {
  const buildEmittedStyles = [...builtHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map(([, content]) => content.trim());
  const removedBytes = await page.evaluate((allowedContents) => {
    const styles = [...document.querySelectorAll('style')]
      .filter((style) => !allowedContents.includes(style.textContent.trim()));
    const bytes = styles.reduce((sum, style) => sum + style.textContent.length, 0);
    styles.forEach((style) => style.remove());
    return bytes;
  }, buildEmittedStyles);
  if (removedBytes > 0) {
    console.log(`Removed ${Math.round(removedBytes / 1024)} KB of runtime-injected <style> CSS.`);
  }
}

/*
 * index.html injects the analytics tag itself, from an inline listener that fires on `load`, so
 * that a slow third-party host can never delay the load event. Capturing the page after mount
 * therefore finds that tag in the DOM and bakes it into the static HTML, which defeats the whole
 * point twice over: the baked copy is a plain `<script src>` in <head> that loads on the critical
 * path, and the inline listener still appends a second copy on every real page load. Two tags, two
 * script executions, two pageviews counted per visit. Only the scripts the build itself emitted
 * belong in the shipped HTML.
 */
async function stripRuntimeInjectedScripts(page, builtHtml) {
  const buildEmittedSources = [...builtHtml.matchAll(/<script[^>]+\ssrc="([^"]+)"[^>]*>/g)]
    .map(([, source]) => source);
  const removedSources = await page.evaluate((allowedSources) => {
    const scripts = [...document.querySelectorAll('script[src]')]
      .filter((script) => !allowedSources.includes(script.getAttribute('src')));
    const sources = scripts.map((script) => script.getAttribute('src'));
    scripts.forEach((script) => script.remove());
    return sources;
  }, buildEmittedSources);
  if (removedSources.length > 0) {
    console.log(`Removed ${removedSources.length} runtime-injected script tag(s): ${removedSources.join(', ')}`);
  }
}

/*
 * Ace sizes its glyphs by rendering probe nodes filled with hundreds of repeated characters
 * (512 'ה' and 534 'X' at the time of writing) into a hidden, absolutely-positioned container.
 * They are invisible, they are rebuilt from scratch when the editor chunk loads at runtime, and in
 * the snapshot they do active harm: they are dead bytes on every cold load, and they land in the
 * middle of the text that crawlers and AI scrapers extract from the page. The rest of the editor
 * subtree stays, because the generated script it shows is real content.
 */
async function stripRuntimeInjectedFontProbes(page) {
  const removedCharacters = await page.evaluate(() => {
    const probes = [...document.querySelectorAll(
      'div[style*="visibility: hidden"][style*="white-space: pre"]',
    )];
    const characters = probes.reduce((sum, probe) => sum + probe.textContent.length, 0);
    probes.forEach((probe) => probe.remove());
    return characters;
  });
  if (removedCharacters > 0) {
    console.log(`Removed ${removedCharacters} characters of hidden font-measurement probes.`);
  }
}

/*
 * The three strip steps above are the only thing standing between a runtime-injected node and the
 * shipped HTML, and each one is a silent failure: nothing breaks, the page just carries a tag it
 * should not. Assert on the result instead of trusting the steps, so a future change to how the
 * analytics tag is injected fails the build rather than doubling the pageview count in production.
 */
function assertNoRuntimeInjectedScripts(html, builtHtml) {
  const shippedSources = [...html.matchAll(/<script[^>]+\ssrc="([^"]+)"[^>]*>/g)]
    .map(([, source]) => source);
  const buildEmittedSources = [...builtHtml.matchAll(/<script[^>]+\ssrc="([^"]+)"[^>]*>/g)]
    .map(([, source]) => source);
  const unexpectedSources = shippedSources.filter(
    (source) => !buildEmittedSources.includes(source),
  );
  if (unexpectedSources.length > 0) {
    throw new Error(
      'The prerendered HTML carries script tags the build did not emit: '
      + `${unexpectedSources.join(', ')}. `
      + 'These were injected at runtime and would ship in <head>, loading on the critical path and '
      + 'executing a second time when the injector in index.html runs. Extend '
      + 'stripRuntimeInjectedScripts() to cover them.',
    );
  }
}

/*
 * `renderCodeEditor()` only knows how the editor is triggered today, and the strip steps run over
 * the document afterwards; neither guarantees the generated script is in the bytes that get
 * written. Losing it is a silent failure — the page still looks fine, it just ships an empty box
 * where a screenful of indexable copy used to be — so assert on the final HTML rather than on the
 * steps that are supposed to produce it.
 */
function assertPrerenderedScript(html) {
  const renderedText = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
  if (!renderedText.includes(PRERENDERED_SCRIPT_PHRASE)) {
    throw new Error(
      `The prerendered HTML does not contain "${PRERENDERED_SCRIPT_PHRASE}" from the generated `
      + 'default script, so the lazily-loaded code editor never rendered into the snapshot. Check '
      + 'that renderCodeEditor() still triggers it, and that the default script in '
      + 'TheCodeArea.vue still carries that phrase.',
    );
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
    /*
     * The snapshot is produced by really loading the page, so the analytics tracker would run
     * here and report a pageview for every build. Blocking the request keeps build machines out
     * of the stats; nothing in the rendered output depends on it.
     */
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (new URL(request.url()).origin === ORIGIN) {
        request.continue();
      } else {
        request.abort();
      }
    });
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
    await renderCodeEditor(page);
    const builtHtml = await readFile(INDEX_FILE, 'utf8');
    await stripRuntimeInjectedPreloads(page, builtHtml);
    await stripRuntimeInjectedStyles(page, builtHtml);
    await stripRuntimeInjectedScripts(page, builtHtml);
    await stripRuntimeInjectedFontProbes(page);
    const html = await page.content();
    if (!html.includes('app__wrapper')) {
      throw new Error('Prerendered HTML is missing app content; aborting to avoid deploying an empty page.');
    }
    assertNoRuntimeInjectedScripts(html, builtHtml);
    assertPrerenderedScript(html);
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
