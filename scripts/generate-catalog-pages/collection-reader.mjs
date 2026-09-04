/*
 * Reads the collection YAML files and flattens them into the shape the page templates want.
 *
 * This deliberately parses the YAML rather than reusing the app's own collection compiler. The
 * pages show script names, the category tree and this fork's recommendation verdict; none of that
 * needs the templating engine, and reaching into `src/application` from a build script would drag
 * the whole TypeScript graph and the `{{ with }}` expression compiler into the page build for data
 * it does not use. The trade is that these pages never show generated code, which is also what
 * keeps them from restating upstream's script bodies verbatim.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';

export const OPERATING_SYSTEMS = [
  {
    key: 'windows',
    file: 'windows.yaml',
    name: 'Windows',
    slug: 'windows',
    /*
     * A floor, not the real count: the assertion exists to catch a collection failing to parse or a
     * refactor silently emptying a page, not to be updated every time a script is added. Set well
     * below today's total so adding scripts never breaks the build and removing most of them does.
     */
    minimumScripts: 700,
  },
  {
    key: 'macos', file: 'macos.yaml', name: 'macOS', slug: 'macos', minimumScripts: 100,
  },
  {
    key: 'linux', file: 'linux.yaml', name: 'Linux', slug: 'linux', minimumScripts: 90,
  },
];

const RECOMMENDATION_LEVELS = {
  standard: { key: 'standard', label: 'Recommended' },
  strict: { key: 'strict', label: 'Strict' },
  none: { key: 'none', label: 'Opt-in only' },
};

export async function readCollection(collectionsDirectory, operatingSystem) {
  const filePath = join(collectionsDirectory, operatingSystem.file);
  const parsed = yaml.load(await readFile(filePath, 'utf8'));
  if (!parsed?.actions?.length) {
    throw new Error(`${operatingSystem.file} parsed without any actions.`);
  }
  const categories = parsed.actions.map((action) => toCategory(action));
  const scripts = categories.flatMap((category) => collectScripts(category));
  if (scripts.length < operatingSystem.minimumScripts) {
    throw new Error(
      `${operatingSystem.file} yielded only ${scripts.length} scripts, below the floor of `
      + `${operatingSystem.minimumScripts}. Either the file failed to parse as expected or the `
      + 'collection shrank drastically; refusing to generate a near-empty page.',
    );
  }
  return {
    ...operatingSystem,
    categories,
    totalScripts: scripts.length,
    recommendationCounts: countRecommendations(scripts),
  };
}

function toCategory(node) {
  const children = node.children ?? [];
  return {
    type: 'category',
    name: node.category,
    docs: normalizeDocs(node.docs),
    subCategories: children.filter(isCategory).map((child) => toCategory(child)),
    scripts: children.filter((child) => !isCategory(child)).map((child) => toScript(child)),
  };
}

function toScript(node) {
  return {
    type: 'script',
    name: node.name,
    docs: normalizeDocs(node.docs),
    recommendation: RECOMMENDATION_LEVELS[node.recommend ?? 'none'] ?? RECOMMENDATION_LEVELS.none,
    isReversible: Boolean(node.revertCode) || hasCall(node),
  };
}

/*
 * `revertCode` only appears on scripts that inline their own code. A script that delegates through
 * `call:` inherits whatever revert its shared function defines, and resolving that would mean
 * walking the `functions:` block, so treat delegated scripts as reversible, which is what the
 * shared functions in all three collections actually implement.
 */
function hasCall(node) {
  return node.call !== undefined;
}

function isCategory(node) {
  return node.category !== undefined;
}

function normalizeDocs(docs) {
  if (!docs) {
    return [];
  }
  return Array.isArray(docs) ? docs : [docs];
}

function collectScripts(category) {
  return [
    ...category.scripts,
    ...category.subCategories.flatMap((subCategory) => collectScripts(subCategory)),
  ];
}

function countRecommendations(scripts) {
  return scripts.reduce((counts, script) => ({
    ...counts,
    [script.recommendation.key]: (counts[script.recommendation.key] ?? 0) + 1,
  }), { standard: 0, strict: 0, none: 0 });
}
