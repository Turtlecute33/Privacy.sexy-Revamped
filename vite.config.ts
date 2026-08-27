/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig, type Plugin, type UserConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ViteYaml from '@modyfi/vite-plugin-yaml';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import distDirs from './dist-dirs.json' with { type: 'json' };
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
      injectLcpFontPreload(),
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
  The <h1> in TheHeader.vue is the LCP element and the only consumer of 'Slabo 27px', which
  `_fonts.scss` sets to `font-display: block` so the heading paints once, in its final font,
  instead of painting in the fallback and repainting larger later (see the comment there).
  `block` only pays off if the font is already in flight when the first paint is attempted, and
  discovering it through the stylesheet is too late — hence a preload.

  The tag has to be emitted at build time rather than written into index.html by hand, because the
  file name is content-hashed. Reading it out of the bundle also means a font rename cannot
  silently drop the preload: the build fails instead.
*/
const LCP_FONT_FILE_PATTERN = /(?:^|\/)slabo-27px-[^/]*\.woff2$/;

function injectLcpFontPreload(): Plugin {
  let baseUrl = '/';
  return {
    name: 'privacy-sexy:inject-lcp-font-preload',
    apply: 'build',
    configResolved(config) {
      baseUrl = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const fontFileName = Object
          .keys(context.bundle ?? {})
          .find((fileName) => LCP_FONT_FILE_PATTERN.test(fileName));
        if (!fontFileName) {
          throw new Error(
            'Could not find the LCP font in the bundle to preload it. '
            + `No emitted file matches ${LCP_FONT_FILE_PATTERN}. `
            + 'If the font was renamed or removed, update LCP_FONT_FILE_PATTERN in vite.config.ts '
            + 'and the `font-display` choice in src/presentation/assets/styles/_fonts.scss.',
          );
        }
        return [{
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: `${baseUrl}${fontFileName}`,
            as: 'font',
            type: 'font/woff2',
            crossorigin: '',
          },
          injectTo: 'head-prepend',
        }];
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
