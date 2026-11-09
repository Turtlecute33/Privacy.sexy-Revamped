/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig, type Plugin, type UserConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import distDirs from './dist-dirs.json' with { type: 'json' };
import packageJson from './package.json' with { type: 'json' };
import { getAliases, getClientEnvironmentVariables, getSelfDirectoryAbsolutePath } from './vite-config-helper';

const WEB_DIRECTORY = resolve(getSelfDirectoryAbsolutePath(), 'src/presentation');
const TEST_INITIALIZATION_FILE = resolve(getSelfDirectoryAbsolutePath(), 'tests/shared/bootstrap/setup.ts');

export function createVueConfig(): UserConfig {
  return {
    root: WEB_DIRECTORY,
    base: process.env.DEPLOY_BASE_URL ?? '/',
    build: {
      outDir: resolve(getSelfDirectoryAbsolutePath(), distDirs.web),
      emptyOutDir: true,
      modulePreload: {
        /*
          Collection chunks are large (the Windows one dominates the bundle) and every visit
          statically imports all three, so Vite preloads all of them at highest priority. That
          competes with the stylesheet and entry chunk for bandwidth during the first round trip,
          delaying the paint of the prerendered snapshot that `scripts/prerender.mjs` bakes in.
          Dropping the hint does not remove the requests, only their head start: the module graph
          still pulls each chunk in once the entry is parsed. Keep the hints for every other
          dependency, which are small enough to be worth fetching early.
        */
        resolveDependencies: (_, dependencies) => dependencies.filter(
          (dependency) => !isCollectionChunk(dependency),
        ),
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            const collectionName = getCollectionChunkName(id);
            return collectionName ? `collection-${collectionName}` : undefined;
          },
        },
      },
    },
    plugins: [
      vue(),
      ViteYaml(),
      injectPackageVersion(),
      ViteMinifyPlugin(getStaticHtmlMinificationOptions()), // Minifies index.html
    ],
    esbuild: {
      supported: {
        'top-level-await': true, // Exclude browsers not supporting top-level-await
      },
    },
    define: {
      ...getClientEnvironmentVariables(),
    },
    resolve: {
      alias: {
        ...getAliases(),
      },
    },
    server: {
      port: 3169,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      alias: {
        ...getAliases(),
      },
      setupFiles: [
        TEST_INITIALIZATION_FILE,
      ],
    },
  };
}

export default defineConfig(createVueConfig());

/*
  The structured data in index.html tells search and AI answer engines which release they are
  looking at. Typed by hand, it still said 0.13.8 two releases later, so it is filled in from
  package.json, and the build fails if the placeholder disappears rather than shipping it raw.
*/
const PACKAGE_VERSION_PLACEHOLDER = '__PACKAGE_VERSION__';

function injectPackageVersion(): Plugin {
  return {
    name: 'privacy-sexy:inject-package-version',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes(PACKAGE_VERSION_PLACEHOLDER)) {
          throw new Error(
            `index.html no longer contains ${PACKAGE_VERSION_PLACEHOLDER}. `
            + 'If the version was removed on purpose, remove this plugin from vite.config.ts too.',
          );
        }
        return html.replaceAll(PACKAGE_VERSION_PLACEHOLDER, packageJson.version);
      },
    },
  };
}

function getCollectionChunkName(id: string): string | undefined {
  const collectionMatch = id.match(/\/collections\/(windows|macos|linux)\.yaml$/);
  return collectionMatch?.[1];
}

/* Matches the emitted file names of the chunks `manualChunks` above names `collection-<os>`. */
function isCollectionChunk(fileName: string): boolean {
  return /(?:^|\/)collection-(?:windows|macos|linux)-[^/]*\.js$/.test(fileName);
}

function getStaticHtmlMinificationOptions(): Parameters<typeof ViteMinifyPlugin>[0] {
  return {
    /* Options: https://www.npmjs.com/package/html-minifier-terser */
    minifyCSS: true,
    minifyJS: true,
    removeComments: true,
    noNewlinesBeforeTagClose: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    customAttrCollapse: /.*/, // Strip newlines from all attributes
    collapseWhitespace: true,
  };
}
