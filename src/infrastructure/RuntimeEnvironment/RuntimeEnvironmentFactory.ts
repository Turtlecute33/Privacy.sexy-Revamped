import { BrowserRuntimeEnvironment } from './Browser/BrowserRuntimeEnvironment';
import type { RuntimeEnvironment } from './RuntimeEnvironment';

export const CurrentEnvironment = createBrowserRuntimeEnvironment(globalThis.window);

export function createBrowserRuntimeEnvironment(
  globalWindow: Window | undefined | null,
  browserEnvironmentFactory: BrowserRuntimeEnvironmentFactory = (
    window,
  ) => new BrowserRuntimeEnvironment(window),
): RuntimeEnvironment {
  if (!globalWindow) {
    throw new Error('Unsupported runtime environment: browser window is unavailable.');
  }
  return browserEnvironmentFactory(globalWindow);
}

export type BrowserRuntimeEnvironmentFactory = (window: Window) => RuntimeEnvironment;

export type GlobalWindowAccessor = Window | undefined;
