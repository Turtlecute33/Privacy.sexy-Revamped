import { OperatingSystem } from '@/domain/OperatingSystem';

/*
 * The app normally opens on the operating system it detects from the browser. That is the right
 * default for someone arriving at the root URL, but wrong for someone arriving from one of the
 * static catalog pages (`/macos/`, `/linux/`, …), which link to `/?os=<slug>`: a visitor who
 * clicked through from the Linux catalog on a Windows machine would land on the Windows collection
 * and have to find the switch themselves.
 *
 * Only the three slugs the catalog pages emit are accepted, and an unrecognised or absent value
 * falls through to detection, so no URL can put the app into a state the OS selector cannot reach.
 * Notably `/` with no query string is unaffected, so `scripts/prerender.mjs`, which loads the bare
 * root and asserts the Windows collection is showing, keeps working unchanged.
 */
/*
 * A `Map`, not an object literal: an object literal inherits from `Object.prototype`, so
 * `?os=constructor` and `?os=toString` would resolve to inherited members rather than miss.
 */
const OS_SLUGS: ReadonlyMap<string, OperatingSystem> = new Map([
  ['windows', OperatingSystem.Windows],
  ['macos', OperatingSystem.macOS],
  ['linux', OperatingSystem.Linux],
]);

export const QUERY_PARAMETER_NAME = 'os';

export function readRequestedOperatingSystem(
  search: string | undefined = globalThis.location?.search,
): OperatingSystem | undefined {
  if (!search) {
    return undefined;
  }
  const slug = new URLSearchParams(search).get(QUERY_PARAMETER_NAME);
  if (!slug) {
    return undefined;
  }
  return OS_SLUGS.get(slug.toLowerCase());
}
