/*
 * `/llms.txt` and `/llms-full.txt`, following the llms.txt convention (https://llmstxt.org/).
 *
 * AI answer engines and agents increasingly read these before, or instead of, the HTML. The app's
 * own page is a script builder whose content only exists after JavaScript runs, and even the
 * prerendered snapshot shows one category of one operating system. These files give a reader that
 * fetches a single URL the whole picture in plain Markdown: what the tool is, how it handles data,
 * and which tweaks exist on which system with which recommendation.
 *
 * Same content rule as the catalog pages (see pages.mjs): names, structure and this fork's
 * recommendation tiers only, never the upstream documentation prose.
 */
import { SITE_NAME, SITE_ORIGIN } from './layout.mjs';
import { countScripts, flattenCategory } from './pages.mjs';

const REPOSITORY_URL = 'https://github.com/Turtlecute33/Privacy.sexy-Revamped';

const TIER_LEGEND = 'Each tweak carries one recommendation tier: **Recommended** (selected by the '
  + 'Standard and Strict presets), **Strict** (added by the Strict preset only) or **Opt-in only** '
  + '(in neither preset; it is documented, not advised, usually because it trades away a security '
  + 'protection).';

export function renderLlmsTxt(collections, pages) {
  const total = sumScripts(collections);
  const collectionPages = collections.map((collection) => ({
    collection,
    page: findPage(pages, `/${collection.slug}/`),
  }));
  const alternatives = findPage(pages, '/privacy-sexy-alternatives/');
  return `# ${SITE_NAME}

> Free, open-source web tool that builds privacy, debloat and security-hardening scripts for
> Windows, macOS and Linux. An actively maintained fork of privacy.sexy. You pick tweaks, read the
> exact commands, then download or copy one script and run it on your own computer.

- Live tool: ${SITE_ORIGIN}/
- Catalog size: ${total} tweaks (${describeCounts(collections)}).
- ${TIER_LEGEND}
- How to use it: choose a system and a preset (Standard is the safe starting point), adjust
  individual tweaks, review the generated batch (Windows) or shell (macOS, Linux) script, then run
  it as administrator or root. Most tweaks also generate a revert script that undoes them.
- Data handling: there is no backend and no account. Scripts are built in the browser and the
  selection never leaves the device. No cookies, no advertising or third-party trackers; the only
  request beyond the site itself is an anonymous page-view count to a self-hosted analytics server.
- Name: the site goes by its address, privacy.turtlecute.org; it is also called privacy.sexy
  Revamped. It is not privacy.sexy, the upstream site.
- Relationship to upstream: an independent fork of undergroundwires/privacy.sexy, not affiliated
  with the original author. The upstream catalog's last release was 0.13.8 (March 2025); this fork
  keeps it current, has tightened which tweaks are recommended, and is web only.
- License: GNU AGPL v3.0.

## Script catalogs

${collectionPages.map(({ collection, page }) => `- [${page.title}](${SITE_ORIGIN}${page.path}): `
    + `${collection.totalScripts} tweaks, ${collection.recommendationCounts.standard} recommended, `
    + `${collection.recommendationCounts.strict} strict, `
    + `${collection.recommendationCounts.none} opt-in only. ${page.description}`).join('\n')}

## Comparisons

- [${alternatives.title}](${SITE_ORIGIN}${alternatives.path}): ${alternatives.description}

## Optional

- [Full tweak index](${SITE_ORIGIN}/llms-full.txt): every tweak name on every system, grouped by category, with its recommendation tier.
- [Source code](${REPOSITORY_URL}): the script collections are YAML files under \`src/application/collections\`.
- [Changelog](${REPOSITORY_URL}/blob/master/CHANGELOG.md)
`;
}

export function renderLlmsFullTxt(collections, generatedOn) {
  return `# ${SITE_NAME}: full tweak index

> Every tweak the script builder at ${SITE_ORIGIN}/ can add to a script: ${sumScripts(collections)} in
> total (${describeCounts(collections)}). Generated on ${generatedOn} from the collections in
> ${REPOSITORY_URL}.

${TIER_LEGEND} A tweak is a change you can select; the builder turns your selection into one script
that you read before running. Category paths read outer to inner, separated by " > ".

${collections.map((collection) => renderCollection(collection)).join('\n')}`;
}

function renderCollection(collection) {
  return `## ${collection.name} (${collection.totalScripts} tweaks)

Catalog page: ${SITE_ORIGIN}/${collection.slug}/

${collection.categories.map((category) => renderCategory(category)).join('\n')}`;
}

function renderCategory(category) {
  const sections = flattenCategory(category, []);
  return `### ${category.name} (${countScripts(category)})

${sections.map(({ path, scripts }) => [
    ...(path.length > 0 ? [`#### ${path.join(' > ')}`, ''] : []),
    ...scripts.map((script) => `- ${script.name} [${script.recommendation.label}]`),
    '',
  ].join('\n')).join('\n')}`;
}

function findPage(pages, path) {
  const page = pages.find((candidate) => candidate.path === path);
  if (!page) {
    throw new Error(`llms.txt links to ${path}, but no page with that path was generated.`);
  }
  return page;
}

function sumScripts(collections) {
  return collections.reduce((sum, collection) => sum + collection.totalScripts, 0);
}

function describeCounts(collections) {
  return collections
    .map((collection) => `${collection.totalScripts} ${collection.name}`)
    .join(', ');
}
