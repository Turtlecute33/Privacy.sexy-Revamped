/*
 * Generates the social share image (Open Graph / Twitter card) at
 * src/presentation/public/og-image.png (1200x630). Run manually when the
 * branding changes:  node scripts/generate-og-image.mjs
 * Uses system Chrome via PUPPETEER_EXECUTABLE_PATH, or puppeteer's Chromium.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'src/presentation/public/og-image.png');

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    display: flex; flex-direction: column; justify-content: center;
    padding: 84px 96px;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #dbe7ff;
    background:
      radial-gradient(1100px 600px at 82% -10%, rgba(32,201,161,0.20), transparent 60%),
      linear-gradient(135deg, #0b1730 0%, #142a54 100%);
    position: relative; overflow: hidden;
  }
  .eyebrow {
    display: flex; align-items: center; gap: 14px;
    font-size: 24px; font-weight: 700; letter-spacing: 0.16em;
    text-transform: uppercase; color: #6fe3c8; margin-bottom: 28px;
  }
  .dot { width: 14px; height: 14px; border-radius: 50%; background: #20c9a1; }
  h1 { font-size: 104px; font-weight: 800; letter-spacing: -0.04em; line-height: 0.98; color: #fff; }
  h1 .revamped { color: #20c9a1; }
  p.tagline { margin-top: 30px; font-size: 40px; font-weight: 500; line-height: 1.25; color: #aebfe0; max-width: 900px; }
  .footer {
    position: absolute; left: 96px; right: 96px; bottom: 64px;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 26px; color: #8ea3cf;
  }
  .badge { padding: 12px 22px; border: 2px solid rgba(32,201,161,0.5); border-radius: 999px; color: #6fe3c8; font-weight: 600; }
  .shield { position: absolute; top: 76px; right: 90px; width: 150px; height: 165px; opacity: 0.95; }
</style></head><body>
  <svg class="shield" viewBox="0 0 80 88"><path fill="#3a65ab" d="M40 3 73 15v23c0 21-12 37-33 47C19 75 7 59 7 38V15L40 3Z"/><path fill="none" stroke="#6fe3c8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" d="m24 43 10 10 23-26"/></svg>
  <div class="eyebrow"><span class="dot"></span>Open-source privacy workbench</div>
  <h1>privacy.sexy<br><span class="revamped">Revamped</span></h1>
  <p class="tagline">Build scripts to debloat, harden, and disable telemetry on Windows, macOS &amp; Linux.</p>
  <div class="footer">
    <span class="badge">Free &amp; open source · runs in your browser</span>
    <span>privacy.turtlecute.org</span>
  </div>
</body></html>`;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(HTML, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: OUTPUT, type: 'png' });
  console.log(`OG image written to ${OUTPUT}`);
} finally {
  await browser.close();
}
