/*
 * Captures the screenshots shown in README.md and the repository's social preview card into
 * img/readme/. Run after UI changes that the screenshots would show:
 *
 *   npm run build && npm run generate:readme-images
 *
 * It serves the production build from dist-web with `vite preview`, so build first.
 *
 * Every screenshot exists in a light and a dark variant: README.md picks one with
 * `<picture>` and `prefers-color-scheme`, so the image matches the reader's GitHub theme. They are
 * WebP at 2x (about 250 KB each, against 1.3 MB as PNG); GitHub renders WebP in READMEs.
 *
 * The social preview stays PNG, as GitHub requires, and is not applied automatically: GitHub has no
 * API for it. Upload img/readme/social-preview.png under Settings > General > Social preview.
 *
 * The OS is chosen through the user agent, which the app reads on start, and the scenes select
 * tweaks by their visible names. If a rename breaks a scene, update the names below.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { preview } from 'vite';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'img/readme');
const LOGO_FILE = resolve(ROOT, 'src/presentation/assets/icons/logo.svg');
const PORT = 4179;

const USER_AGENTS = {
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  macos: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

/* Each scene: the OS, then visible button or label texts clicked in order. */
const SCENES = [
  {
    name: 'hero',
    os: 'windows',
    clicks: ['Standard', 'Disable OS data collection', 'Disable Click to Do', 'Disable Recall'],
  },
  { name: 'macos', os: 'macos', clicks: ['Standard', 'Configure OS'] },
  { name: 'linux', os: 'linux', clicks: ['Standard', 'Disable OS data collection'] },
];

const delay = (ms) => new Promise((done) => { setTimeout(done, ms); });

async function clickByText(page, text) {
  const clicked = await page.evaluate((wanted) => {
    const normalize = (value) => value.trim().replace(/\s+/g, ' ');
    const candidates = [...document.querySelectorAll('button, label, a')];
    const target = candidates.find(
      (element) => element.offsetParent !== null
        && normalize(element.textContent).startsWith(wanted),
    );
    target?.click();
    return Boolean(target);
  }, text);
  if (!clicked) {
    throw new Error(`Nothing visible to click with the text "${text}".`);
  }
  await delay(600);
}

/*
 * The screenshot stops where the footer starts. Its one line of small text is unreadable at README
 * size, and the gap the footer leaves below the panels matches the one above the top bar.
 */
async function getClipAboveFooter(page) {
  return page.evaluate(() => ({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: Math.round(document.querySelector('.footer').getBoundingClientRect().top),
  }));
}

async function captureScene(browser, url, scene, scheme) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(USER_AGENTS[scene.os]);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await page.goto(url, { waitUntil: 'networkidle0' });
    await delay(1000);
    for (const text of scene.clicks) {
      await clickByText(page, text); // eslint-disable-line no-await-in-loop
    }
    await page.mouse.move(700, 880); // Over the footer, outside the shot: no hover states
    await delay(800);
    const clip = await getClipAboveFooter(page);
    const path = resolve(OUTPUT_DIR, `${scene.name}-${scheme}.webp`);
    await page.screenshot({
      path, clip, type: 'webp', quality: 88,
    });
    console.log(`Wrote ${path}`);
    // The social preview embeds the light hero. PNG keeps it sharp before the card is encoded.
    const png = scheme === 'light' && scene.name === 'hero'
      ? await page.screenshot({ clip, type: 'png' })
      : undefined;
    return png;
  } finally {
    await page.close();
  }
}

function renderSocialPreview(logoSvg, screenshotBase64) {
  const logo = logoSvg
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
    .replace('<svg ', '<svg width="30" height="30" ');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1280px; height: 640px; }
  body {
    position: relative; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif;
    color: #0b1220;
    background:
      radial-gradient(520px 420px at 92% 8%, rgba(78, 128, 255, 0.30), transparent 70%),
      radial-gradient(520px 420px at 70% 105%, rgba(30, 205, 185, 0.22), transparent 70%),
      radial-gradient(460px 380px at 0% 100%, rgba(155, 115, 255, 0.16), transparent 70%),
      #eef1f8;
  }
  .copy { position: absolute; left: 72px; top: 72px; width: 520px; }
  .brand { display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 650; letter-spacing: -0.02em; }
  .logo {
    display: grid; place-items: center; width: 48px; height: 48px; border-radius: 14px; color: #fff;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 55%),
      linear-gradient(140deg, #6f97ff 0%, #2f62e0 52%, #14a58a 100%);
    box-shadow: inset 0 1.5px 0 rgba(255, 255, 255, 0.45), 0 12px 28px -8px rgba(47, 98, 224, 0.5);
  }
  h1 { margin-top: 70px; font-size: 62px; font-weight: 750; line-height: 1.04; letter-spacing: -0.045em; }
  h1 span { color: #2f62e0; }
  p { margin-top: 26px; font-size: 24px; line-height: 1.4; color: #3d475a; letter-spacing: -0.01em; }
  .note { position: absolute; left: 72px; bottom: 64px; font-size: 20px; color: #566174; }
  .frame {
    position: absolute; left: 650px; top: 96px; width: 1060px; border-radius: 22px; overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.06), 0 30px 80px -20px rgba(40, 60, 130, 0.35);
  }
  .frame img { display: block; width: 100%; }
</style></head><body>
  <div class="copy">
    <div class="brand"><span class="logo">${logo}</span>debloat.net</div>
    <h1>Debloat and harden<br><span>Windows, macOS<br>&amp; Linux.</span></h1>
    <p>Free, open-source privacy scripts.<br>Read every command before you run it.</p>
  </div>
  <span class="note">The maintained fork of privacy.sexy</span>
  <div class="frame"><img src="data:image/png;base64,${screenshotBase64}"></div>
</body></html>`;
}

async function captureSocialPreview(browser, heroPng) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 640, deviceScaleFactor: 1 });
    const logoSvg = await readFile(LOGO_FILE, 'utf8');
    await page.setContent(renderSocialPreview(logoSvg, Buffer.from(heroPng).toString('base64')), { waitUntil: 'load' });
    const path = resolve(OUTPUT_DIR, 'social-preview.png');
    await page.screenshot({ path, type: 'png' });
    console.log(`Wrote ${path}`);
  } finally {
    await page.close();
  }
}

const server = await preview({
  configFile: resolve(ROOT, 'vite.config.ts'),
  preview: { port: PORT, strictPort: true, open: false },
});
const browser = await puppeteer.launch({ headless: true });
try {
  const url = `http://localhost:${PORT}/`;
  let heroPng;
  for (const scene of SCENES) {
    for (const scheme of ['light', 'dark']) {
      // Sequential on purpose: parallel pages compete for CPU and capture half-rendered frames.
      // eslint-disable-next-line no-await-in-loop
      const png = await captureScene(browser, url, scene, scheme);
      heroPng ??= png;
    }
  }
  await captureSocialPreview(browser, heroPng);
} finally {
  await browser.close();
  await new Promise((done) => { server.httpServer.close(done); });
}
