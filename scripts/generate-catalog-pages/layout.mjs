/*
 * The shared HTML shell for the static catalog and article pages.
 *
 * These pages ship no JavaScript at all. They exist to be read and indexed, and the app is one
 * click away, so a framework would only add a mount cost to a document that is already complete.
 * The CSS is inlined for the same reason: it is under 4 KB, and a separate request would gate the
 * first paint on a round trip these pages do not otherwise need.
 *
 * Colours and type mirror `src/presentation/assets/styles/_colors.scss` and `_typography.scss` by
 * hand. Importing the Sass would mean compiling it per page and pulling in the app's whole style
 * graph; the values below are the small subset these pages use. If the palette changes, this is the
 * second place to update.
 */
export const SITE_ORIGIN = 'https://privacy.turtlecute.org';
export const SITE_NAME = 'privacy.sexy Revamped';

/*
 * Comments live out here rather than inside the string, because the string is inlined into every
 * page and shipped to every reader.
 *
 * Three things carry the small-screen layout:
 *
 * 1. Script rows are a two-column grid, not a wrapping flex row. A long script name used to push
 *    its tag onto a second line, so most rows were twice as tall and a 900-entry list read as a
 *    wall of text. The name column now wraps on its own and the tag stays on the first line.
 * 2. `.tag--none` loses its filled pill. Two thirds of the catalog is opt-in only, so a filled
 *    badge on those rows is the background rather than the signal; the two recommendation tiers
 *    keep theirs and are what the eye finds.
 * 3. Below 900px the rail stops being a column and becomes the page's navigation bar: one row of
 *    chips that scrolls sideways and stays under the top edge, with the group headings parked
 *    right below it. `.wrap` leaves grid layout for that, because a sticky grid item is bounded
 *    by its own row, and on one column that row is the height of the bar itself. As a block child
 *    of `.wrap` the rail sticks for the whole page instead.
 */
const STYLES = `
:root{--surface:#f9fbff;--elevated:#fff;--on-surface:#172033;--muted:#65708a;--border:#dce4f2;
--primary:#3867d6;--primary-dark:#234ba9;--primary-darkest:#0b1730;--accent:#20c9a1;--bg:#edf2fa}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--surface);color:var(--on-surface);font:17px/1.6 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,Cantarell,'Helvetica Neue',Arial,sans-serif}
a{color:var(--primary-dark)}
a:hover{color:var(--primary)}
.masthead{border-bottom:1px solid var(--border);background:var(--elevated)}
.masthead__inner{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 20px;
width:min(1180px,calc(100% - 40px));margin:0 auto;padding:14px 0}
.masthead__brand{color:var(--primary-darkest);font-size:23px;font-weight:600;letter-spacing:-.02em;text-decoration:none}
.masthead__brand span{color:var(--accent);font-size:.62em;font-weight:700;margin-left:.3em;
text-transform:uppercase;letter-spacing:.08em}
.masthead__links{display:flex;flex-wrap:wrap;gap:18px;margin-left:auto;font-size:15px}
.wrap{display:grid;grid-template-columns:232px minmax(0,1fr);gap:44px;
width:min(1180px,calc(100% - 40px));margin:0 auto;padding:32px 0 72px;align-items:start}
.wrap>main:only-child{grid-column:1/-1}
.rail{position:sticky;top:24px;font-size:15px}
.rail h2{margin:0 0 10px;color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
.rail ol{margin:0;padding:0;list-style:none}
.rail li+li{margin-top:2px}
.rail a{display:block;padding:5px 10px;border-left:2px solid var(--border);
color:var(--on-surface);text-decoration:none;line-height:1.3}
.rail a:hover{border-left-color:var(--accent);background:var(--bg)}
.rail__count{color:var(--muted);font-size:13px}
main>h1{margin:0 0 12px;font-size:clamp(30px,3.6vw,42px);line-height:1.14;letter-spacing:-.02em;
color:var(--primary-darkest)}
.lede{max-width:66ch;margin:0 0 20px;font-size:19px;line-height:1.55;color:var(--on-surface)}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 24px;padding:0;list-style:none}
.stats li{padding:7px 13px;border:1px solid var(--border);border-radius:999px;
background:var(--elevated);font-size:14px}
.stats b{color:var(--primary-darkest)}
.cta{display:inline-block;margin:4px 0 30px;padding:12px 20px;border-radius:10px;
background:var(--primary-darkest);color:#f8fbff;font-weight:600;text-decoration:none}
.cta:hover{background:var(--primary-dark);color:#f8fbff}
.group{margin:0 0 40px;scroll-margin-top:20px}
.group>h2{position:sticky;top:0;z-index:1;margin:0 0 6px;padding:12px 0 8px;
border-bottom:2px solid var(--primary-darkest);background:var(--surface);
font-size:24px;letter-spacing:-.01em;color:var(--primary-darkest)}
.group__docs{margin:10px 0 16px;color:var(--muted);font-size:15px}
.sub{margin:22px 0 8px;font-size:16px;font-weight:700;color:var(--primary-darkest)}
.sub__path{color:var(--muted);font-weight:400}
.items{margin:0;padding:0;list-style:none;border-top:1px solid var(--border)}
.items li{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;
gap:0 12px;padding:8px 2px;border-bottom:1px solid var(--border)}
.items__name{min-width:0}
.tag{padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;
letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.tag--standard{background:#d8f5ec;color:#0a5745}
.tag--strict{background:#dbe7ff;color:#234ba9}
.tag--none{color:var(--muted);font-weight:600}
main h2{margin:34px 0 10px;font-size:26px;letter-spacing:-.01em;color:var(--primary-darkest)}
main h3{margin:26px 0 8px;font-size:19px;color:var(--primary-dark)}
main>p,main>ul>li{max-width:70ch}
main>ul{padding-left:22px}
.note{max-width:70ch;margin:26px 0;padding:14px 18px;border-left:3px solid var(--accent);
background:var(--bg);font-size:16px}
.foot{border-top:1px solid var(--border);background:var(--elevated)}
.foot__inner{width:min(1180px,calc(100% - 40px));margin:0 auto;padding:24px 0 40px;
color:var(--muted);font-size:15px}
.foot__inner p{max-width:76ch}
@media (max-width:900px){
.wrap{display:block;padding:0 0 56px}
.masthead__inner{gap:4px 16px;padding:10px 0}
.masthead__links{width:100%;margin-left:0;gap:8px 16px;font-size:14px}
.wrap>main{padding-top:22px}
.rail{position:sticky;top:0;z-index:3;margin:0 -20px;padding:9px 20px;
background:var(--surface);border-bottom:1px solid var(--border);
overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none}
.rail::-webkit-scrollbar{display:none}
.rail h2{display:none}
.rail ol{display:flex;flex-wrap:nowrap;gap:6px;width:max-content}
.rail li+li{margin-top:0}
.rail a{border:1px solid var(--border);border-radius:999px;background:var(--elevated);
padding:5px 12px;white-space:nowrap}
.group{scroll-margin-top:50px}
.group>h2{top:50px}
}
@media (max-width:640px){
body{font-size:16px}
main>h1{font-size:27px}
.lede{margin-bottom:16px;font-size:17px}
.stats{gap:6px;margin-bottom:18px}
.stats li{padding:5px 11px;font-size:13px}
.cta{margin-bottom:24px;padding:11px 18px}
.group{margin-bottom:30px}
.group>h2{font-size:20px;padding:10px 0 7px}
.sub{margin-top:18px;font-size:14px}
.masthead__brand{font-size:21px}
.masthead__links{gap:6px 14px;font-size:13px}
.items li{padding:9px 2px}
.tag{padding:2px 7px;font-size:11px}
article h2{margin-top:28px;font-size:22px}
article h3{font-size:18px}
.note{margin:20px 0;padding:12px 14px;font-size:15px}
}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
`.trim();

export function renderPage({
  path, title, description, h1, breadcrumb, extraJsonLd = [], rail = '', body,
}) {
  const canonical = `${SITE_ORIGIN}${path}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#page`,
        url: canonical,
        name: title,
        description,
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: breadcrumb.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: `${SITE_ORIGIN}${crumb.path}`,
        })),
      },
      ...extraJsonLd,
    ],
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/favicon.ico" type="image/x-icon">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0b1730">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE_ORIGIN}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="referrer" content="no-referrer">
<style>${STYLES}</style>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<header class="masthead">
  <div class="masthead__inner">
    <a class="masthead__brand" href="/">privacy.sexy<span>Revamped</span></a>
    <nav class="masthead__links" aria-label="Site">
      <a href="/">Script builder</a>
      <a href="/windows/">Windows</a>
      <a href="/macos/">macOS</a>
      <a href="/linux/">Linux</a>
      <a href="/privacy-sexy-alternatives/">Alternatives</a>
    </nav>
  </div>
</header>
<div class="wrap">
${rail ? `<aside class="rail">${rail}</aside>` : ''}
<main>
<h1>${escapeHtml(h1)}</h1>
${body}
</main>
</div>
<footer class="foot">
  <div class="foot__inner">
    <p>
      ${SITE_NAME} is an independently maintained fork of
      <a href="https://github.com/undergroundwires/privacy.sexy" rel="noopener nofollow">undergroundwires/privacy.sexy</a>,
      and is not affiliated with the original project or its author. Scripts change system
      behaviour: read each one, keep backups, and start with the recommended set.
    </p>
    <p>
      <a href="/">Build a script</a> &middot;
      <a href="https://github.com/Turtlecute33/Privacy.sexy-Revamped" rel="noopener">Source code</a> &middot;
      Licensed under the GNU AGPL v3.0
    </p>
  </div>
</footer>
</body>
</html>
`;
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
