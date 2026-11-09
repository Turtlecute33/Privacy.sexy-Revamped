import type { App } from 'vue';

/*
  Dispatched on `document` when the app could not start. index.html reacts to it, the same way it
  reacts to `app-ready`: the page's inline script is the part that still works when the app does
  not, so it is the one that reloads or tells the visitor. Without this, a failed start left the
  prerendered snapshot on screen, looking like the app but doing nothing, and with no explanation.
*/
export const StartupFailedEventType = 'app-failed';

export interface StartupFailedEventDetail {
  /**
   * Whether loading the page again is likely to fix it. That is the case when part of the app
   * failed to download, most often because a deploy replaced the content-hashed files that a
   * cached copy of the page still refers to.
   */
  readonly isRecoverableByReload: boolean;
}

export interface StartupSteps {
  bootstrap(): Promise<void>;
  mount(): Promise<void>;
}

export interface StartupEnvironment {
  readonly window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  readonly document: Pick<Document, 'dispatchEvent'>;
  logError(...params: unknown[]): void;
}

/*
  Fired by Vite's preload helper when a lazily loaded chunk, or the CSS it depends on, fails to
  load. The same error is then thrown to the `import()` caller, so it is only used to tell why the
  start failed.
*/
const PreloadErrorEventType = 'vite:preloadError';

/* Each browser words a failed `import()` differently, and Vite words its CSS preload failure. */
const FailedModuleLoadMessages: readonly string[] = [
  'Failed to fetch dynamically imported module', // Chromium
  'error loading dynamically imported module', // Firefox
  'Importing a module script failed', // Safari
  'Unable to preload CSS', // Vite
];

/**
 * Runs the steps that start the app and reports a failure in any of them, rather than letting it
 * end as an unhandled rejection that leaves the page inert.
 *
 * It does not cover the entry chunk failing to download (this code would never run), nor anything
 * after the app has started, which the features involved handle themselves; reloading on their
 * behalf would throw away the visitor's selection.
 */
export async function startApplication(
  steps: StartupSteps,
  environment: StartupEnvironment = getBrowserEnvironment(),
): Promise<void> {
  let hasChunkFailedToLoad = false;
  const recordChunkFailure = () => { hasChunkFailedToLoad = true; };
  environment.window.addEventListener(PreloadErrorEventType, recordChunkFailure);
  try {
    await steps.bootstrap();
    await steps.mount();
  } catch (error) {
    environment.logError('The application could not start.', error);
    const detail: StartupFailedEventDetail = {
      isRecoverableByReload: hasChunkFailedToLoad || isFailedModuleLoad(error),
    };
    environment.document.dispatchEvent(new CustomEvent(StartupFailedEventType, { detail }));
  } finally {
    environment.window.removeEventListener(PreloadErrorEventType, recordChunkFailure);
  }
}

/**
 * Mounts the app and throws the first error raised while doing so.
 *
 * Vue does not throw errors from component setup or rendering out of `mount()`; it hands them to
 * `app.config.errorHandler`, and without one only logs them in production. A component that throws
 * while mounting leaves an empty or half-built page, which is a failed start, so it must surface as
 * one. The handler is only borrowed for the mount: errors later on are not startup failures.
 */
export function mountReportingErrors(app: App, mount: () => void): void {
  const errors = new Array<unknown>();
  const { errorHandler } = app.config;
  app.config.errorHandler = (error) => {
    errors.push(error);
  };
  try {
    mount();
  } finally {
    app.config.errorHandler = errorHandler;
  }
  if (errors.length > 0) {
    throw errors[0];
  }
}

function isFailedModuleLoad(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return FailedModuleLoadMessages.some((failureMessage) => message.includes(failureMessage));
}

function getBrowserEnvironment(): StartupEnvironment {
  return {
    window,
    document,
    logError: (...params) => {
      /*
        Straight to the console: the app's logger is silent in production, and a failed start is
        exactly what a visitor reporting a bug needs to be able to see in the console.
      */
      // eslint-disable-next-line no-console
      console.error(...params);
    },
  };
}
