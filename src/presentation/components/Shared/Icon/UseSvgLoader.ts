import {
  type WatchSource, shallowReadonly, ref, watch,
} from 'vue';
import { AsyncLazy } from '@/infrastructure/Threading/AsyncLazy';
import type { IconName } from './IconName';

export function useSvgLoader(
  iconWatcher: WatchSource<IconName>,
  loaders: FileLoaders = RawSvgLoaders,
) {
  const svgContent = ref<string>('');

  watch(iconWatcher, async (iconName) => {
    svgContent.value = await lazyLoadSvg(iconName, loaders);
  }, { immediate: true });

  return {
    svgContent: shallowReadonly(svgContent),
  };
}

export function clearIconCache() {
  LazyIconCache.clear();
}

export type FileLoaders = Record<string, () => Promise<string>>;

const LazyIconCache = new Map<IconName, AsyncLazy<string>>();

async function lazyLoadSvg(name: IconName, loaders: FileLoaders): Promise<string> {
  let iconLoader = LazyIconCache.get(name);
  if (!iconLoader) {
    iconLoader = new AsyncLazy<string>(() => loadSvg(name, loaders));
    LazyIconCache.set(name, iconLoader);
  }
  const icon = await iconLoader.getValue();
  return icon;
}

async function loadSvg(name: IconName, loaders: FileLoaders): Promise<string> {
  const iconPath = `/assets/icons/${name}.svg`;
  const loader = loaders[iconPath];
  if (!loader) {
    throw new Error(`missing icon for "${name}" in "${iconPath}"`);
  }
  const svgContent = await loader();
  const modifiedContent = modifySvg(svgContent);
  return modifiedContent;
}

/*
  Bundled into the code that uses them (`eager`) rather than fetched one by one. All 14 icons come
  to about 3 KB gzipped, yet as separate chunks they were 14 requests that started only once the
  app had mounted, the tail of Lighthouse's "Network dependency tree". Mounting also replaces the
  prerendered snapshot, icons included, so every icon on the page blinked out until its chunk
  arrived.
*/
const RawSvgContents = import.meta.glob<string>('@/presentation/assets/icons/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const RawSvgLoaders: FileLoaders = Object.fromEntries(
  Object.entries(RawSvgContents).map(([path, content]) => [path, () => Promise.resolve(content)]),
);

function modifySvg(svgSource: string): string {
  const parser = new globalThis.window.DOMParser();
  const doc = parser.parseFromString(svgSource, 'image/svg+xml');
  let svgRoot = doc.documentElement;
  svgRoot = removeSvgComments(svgRoot);
  svgRoot = fillSvgCurrentColor(svgRoot);
  return new XMLSerializer()
    .serializeToString(svgRoot);
}

function removeSvgComments(svgRoot: HTMLElement): HTMLElement {
  const comments = Array.from(svgRoot.childNodes).filter(
    (node) => node.nodeType === Node.COMMENT_NODE,
  );
  for (const comment of comments) {
    svgRoot.removeChild(comment);
  }
  Array.from(svgRoot.children).forEach((child) => {
    removeSvgComments(child as HTMLElement);
  });
  return svgRoot;
}

function fillSvgCurrentColor(svgRoot: HTMLElement): HTMLElement {
  svgRoot.querySelectorAll('path').forEach((el: Element) => {
    el.setAttribute('fill', 'currentColor');
  });
  return svgRoot;
}
