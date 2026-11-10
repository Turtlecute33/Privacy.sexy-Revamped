/*
 * Generates the social share image (Open Graph / Twitter card) at
 * src/presentation/public/og-image.png (1200x630). Run manually when the
 * branding changes:  node scripts/generate-og-image.mjs
 * Uses system Chrome via PUPPETEER_EXECUTABLE_PATH, or puppeteer's Chromium.
 *
 * After regenerating, bump the `?v=` revision on every URL of the image: the three in
 * src/presentation/index.html and OG_IMAGE_URL in scripts/generate-catalog-pages/layout.mjs. Link
 * previews in Telegram, X, LinkedIn and Facebook are cached by image URL for days to weeks, so the
 * old image keeps showing until the URL changes.
 *
 * Deliberately minimal: one headline, the logo on its flat accent tile and two short lines, in the
 * app's light appearance (src/presentation/assets/styles/_theme.scss). Text is sized to stay
 * legible at half size, which is how most feeds display a 1200px card.
 *
 * The identity on the card is this site's domain, not "privacy.sexy". That name is the upstream
 * project's own domain, so a preview that leads with it teaches people to type the original's
 * address. "privacy.sexy" stays as the fork reference at the bottom, where it earns recognition
 * without competing with the address. Search ranking is unaffected either way: crawlers read the
 * page's title and text, which still carry the name, not the text inside the image.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'src/presentation/public/og-image.png');
const LOGO_FILE = resolve(ROOT, 'src/presentation/assets/icons/logo.svg');

function renderHtml(logoSvg) {
  const logo = logoSvg
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
    .replace('<svg ', '<svg width="32" height="32" ');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    position: relative; overflow: hidden; padding: 80px 88px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', system-ui, Roboto, sans-serif;
    color: #0b1220;
    background: radial-gradient(700px 520px at 108% 50%, rgba(78, 128, 255, 0.22), transparent 70%), #f6f7fb;
  }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 30px; font-weight: 600; letter-spacing: -0.02em; }
  .logo {
    display: grid; place-items: center; width: 52px; height: 52px; border-radius: 15px; color: #fff;
    background: #2f62e0;
  }
  h1 {
    margin-top: 96px; font-size: 80px; font-weight: 750; line-height: 1.04; letter-spacing: -0.045em;
    white-space: nowrap;
  }
  h1 span { color: #2f62e0; }
  .note { position: absolute; left: 88px; bottom: 70px; font-size: 26px; color: #566174; }
</style></head><body>
  <div class="brand"><span class="logo">${logo}</span>debloat.net</div>
  <h1>Privacy scripts for<br><span>Windows, macOS &amp; Linux.</span></h1>
  <span class="note">The actively maintained fork of privacy.sexy</span>
</body></html>`;
}

const logoSvg = await readFile(LOGO_FILE, 'utf8');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(renderHtml(logoSvg), { waitUntil: 'load' });
  await page.screenshot({ path: OUTPUT, type: 'png' });
  console.log(`OG image written to ${OUTPUT}`);
} finally {
  await browser.close();
}
