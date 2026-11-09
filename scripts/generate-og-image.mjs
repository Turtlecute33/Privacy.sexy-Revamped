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
 * The look follows the app's light appearance (src/presentation/assets/styles/_theme.scss): the
 * soft colour backdrop, translucent glass panels and the single blue accent. The right half is a
 * small, simplified picture of the workbench, because a preview that shows the tool says more in a
 * feed than another line of copy. Text sizes are chosen to stay legible at half size, which is how
 * most feeds display a 1200px card.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'src/presentation/public/og-image.png');
const LOGO_FILE = resolve(ROOT, 'src/presentation/assets/icons/logo.svg');

/* Real script names and their real recommendation tiers, from the Windows collection. */
const ROWS = [
  { title: 'Disable Start menu suggestions', tag: 'Recommended', checked: true },
  { title: 'Disable Windows Tips', tag: 'Recommended', checked: true },
  { title: 'Disable Cortana experience', tag: 'Recommended', checked: true },
  { title: 'Disable Recall', tag: 'Strict', checked: true },
  { title: 'Disable real-time monitoring', tag: 'Opt-in only', checked: false },
];

const CODE_LINES = [
  ['comment', ':: Disable Windows Tips'],
  ['code', String.raw`reg add "HKLM\...\CloudContent" ^`],
  ['code', '  /v "DisableSoftLanding" /t REG_DWORD /d 1'],
  ['comment', ':: Disable Recall'],
  ['code', String.raw`reg add "HKLM\...\WindowsAI" ^`],
];

function renderHtml(logoSvg) {
  const logo = logoSvg.replace(/<!--[\s\S]*?-->/g, '').trim();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    position: relative; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', system-ui, Roboto, sans-serif;
    color: #0b1220;
    background:
      radial-gradient(640px 420px at 4% -6%, rgba(78, 128, 255, 0.55), transparent 70%),
      radial-gradient(560px 380px at 102% 8%, rgba(30, 205, 185, 0.42), transparent 70%),
      radial-gradient(700px 420px at 74% 112%, rgba(155, 115, 255, 0.45), transparent 70%),
      radial-gradient(520px 360px at 10% 108%, rgba(255, 160, 115, 0.36), transparent 70%),
      #e8ecf5;
  }
  .glass {
    position: absolute;
    background: rgba(255, 255, 255, 0.55);
    border-radius: 28px;
    box-shadow:
      inset 0 0 0 1.5px rgba(255, 255, 255, 0.75),
      0 0 0 1px rgba(15, 23, 42, 0.06),
      0 24px 60px -24px rgba(40, 60, 130, 0.35);
  }
  .copy { position: absolute; left: 72px; top: 70px; width: 560px; }
  .brand { display: flex; align-items: center; gap: 18px; }
  .logo {
    display: grid; place-items: center; width: 72px; height: 72px; border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 55%),
      linear-gradient(140deg, #6f97ff 0%, #2f62e0 52%, #14a58a 100%);
    box-shadow: inset 0 1.5px 0 rgba(255, 255, 255, 0.45), 0 10px 24px -6px rgba(47, 98, 224, 0.5);
    color: #fff;
  }
  .logo svg { width: 46px; height: 46px; }
  .name { font-size: 46px; font-weight: 700; letter-spacing: -0.03em; }
  .pill {
    padding: 7px 16px; border-radius: 999px; background: rgba(47, 98, 224, 0.13);
    color: #2552c4; font-size: 22px; font-weight: 650;
  }
  h1 {
    margin-top: 46px; font-size: 62px; font-weight: 750; line-height: 1.04; letter-spacing: -0.035em;
  }
  h1 em { font-style: normal; color: #2f62e0; }
  .lede { margin-top: 24px; font-size: 27px; line-height: 1.38; color: #3d475a; }
  .chips { position: absolute; left: 72px; bottom: 58px; display: flex; gap: 12px; }
  .chip {
    padding: 11px 20px; border-radius: 999px; background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.07); font-size: 22px; font-weight: 600; color: #3d475a;
  }
  .chip b { color: #0b1220; }
  .list { left: 652px; top: 58px; width: 504px; padding: 22px 22px 14px; }
  .list__title { display: flex; justify-content: space-between; align-items: baseline; padding: 0 6px 12px; }
  .list__title strong { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
  .list__title span { font-size: 17px; color: #566174; }
  .row {
    display: flex; align-items: center; gap: 14px; height: 50px; padding: 0 12px;
    border-radius: 14px; font-size: 19px; color: #3d475a;
  }
  .row + .row { margin-top: 3px; }
  .row.on { background: rgba(47, 98, 224, 0.08); color: #0b1220; }
  .check {
    flex: 0 0 auto; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
    box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.2);
  }
  .row.on .check { background: #2f62e0; box-shadow: none; }
  .check svg { width: 14px; height: 14px; }
  .row__title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tag { flex: 0 0 auto; font-size: 14px; font-weight: 650; color: #566174; }
  .tag--recommended { color: #2552c4; }
  .tag--strict { color: #6b47c9; }
  .code { left: 708px; top: 392px; width: 460px; padding: 18px 22px; background: rgba(250, 251, 254, 0.86); }
  .code__file { font: 600 17px 'Cascadia Code', Consolas, ui-monospace, monospace; padding-bottom: 10px; }
  .code__line { font: 15.5px/1.6 'Cascadia Code', Consolas, ui-monospace, monospace; font-variant-ligatures: none; white-space: pre; color: #1f2a3d; }
  .code__line--comment { color: #8e908c; }
</style></head><body>
  <div class="copy">
    <div class="brand">
      <span class="logo">${logo}</span>
      <span class="name">privacy.sexy</span>
      <span class="pill">Revamped</span>
    </div>
    <h1>Privacy &amp; debloat scripts for <em>Windows, macOS &amp; Linux</em></h1>
    <p class="lede">Pick tweaks, read every command, run one script. Built in your browser.</p>
  </div>
  <div class="chips">
    <span class="chip"><b>1,300+</b> tweaks</span>
    <span class="chip">Free &amp; open source</span>
  </div>
  <div class="glass list">
    <div class="list__title"><strong>Privacy tweaks</strong><span>4 of 5 selected</span></div>
    ${ROWS.map((row) => `
    <div class="row${row.checked ? ' on' : ''}">
      <span class="check">${row.checked ? '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</span>
      <span class="row__title">${row.title}</span>
      <span class="tag tag--${row.tag.toLowerCase().split(' ')[0].replace('-', '')}">${row.tag}</span>
    </div>`).join('')}
  </div>
  <div class="glass code">
    <div class="code__file">privacy-script.bat</div>
    ${CODE_LINES.map(([kind, text]) => `<div class="code__line${kind === 'comment' ? ' code__line--comment' : ''}">${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</div>`).join('')}
  </div>
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
  await page.setContent(renderHtml(logoSvg), { waitUntil: 'networkidle0' });
  await page.screenshot({ path: OUTPUT, type: 'png' });
  console.log(`OG image written to ${OUTPUT}`);
} finally {
  await browser.close();
}
