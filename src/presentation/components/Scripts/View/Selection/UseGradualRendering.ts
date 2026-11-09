import {
  computed, onScopeDispose, shallowReadonly, shallowRef, watch,
  type Ref, type WatchSource,
} from 'vue';

/**
 * Runs a callback in a later task and returns a function that cancels it.
 */
export type BatchScheduler = (callback: () => void) => () => void;

export interface GradualRenderingOptions {
  /**
   * Rendered synchronously, so the list is never empty in the frame it appears in. Sized to fill
   * the list pane at its tallest (~20 rows), so nothing on screen arrives late.
   */
  readonly initialBatchSize: number;
  /**
   * Added per task after that. A row is several components (checkbox, markdown title, tooltip,
   * revert switch), about 3 ms each with the CPU throttled 4x, so this keeps a batch near the
   * 50 ms long-task threshold on a mid-range phone and far below it on a desktop.
   */
  readonly subsequentBatchSize: number;
  readonly scheduleBatch: BatchScheduler;
}

export interface GradualRendering {
  /** How many of the items should be in the DOM right now. */
  readonly renderedCount: Readonly<Ref<number>>;
  readonly isComplete: Readonly<Ref<boolean>>;
}

/**
 * Renders a long list in slices instead of all at once.
 *
 * Mounting every row in one go froze the page: a one-letter search matches almost every script
 * (893 rows, ~26,000 elements), which was two long tasks totalling 2.5 s with the CPU throttled 4x,
 * with no frame painted and no keystroke handled in between. Rendering the first screenful at once
 * and the rest a slice per frame keeps the page responsive while the list fills in. The whole list
 * still ends up in the DOM (in about a second on a desktop, a few seconds on a slow phone), so
 * in-page search, keyboard navigation and assistive technologies get every row once it is done.
 *
 * Starts over whenever `restartOn` changes, such as a new search query: the new list's first rows
 * matter more than finishing the old one.
 */
export function useGradualRendering(
  totalCount: () => number,
  restartOn: WatchSource<unknown>,
  options: GradualRenderingOptions = createDefaultOptions(),
): GradualRendering {
  const renderedCount = shallowRef(0);
  let cancelScheduledBatch: (() => void) | undefined;

  function cancelPendingBatch(): void {
    cancelScheduledBatch?.();
    cancelScheduledBatch = undefined;
  }

  function renderUpTo(count: number): void {
    const total = totalCount();
    renderedCount.value = Math.min(count, total);
    if (renderedCount.value >= total) {
      return;
    }
    cancelScheduledBatch = options.scheduleBatch(() => {
      cancelScheduledBatch = undefined;
      renderUpTo(renderedCount.value + options.subsequentBatchSize);
    });
  }

  /*
    `immediate`, so the first batch is in place before the first render; the default `pre` flush,
    so a restart lands before the component re-renders with the new list instead of after it.
  */
  watch(restartOn, () => {
    cancelPendingBatch();
    renderUpTo(options.initialBatchSize);
  }, { immediate: true });

  onScopeDispose(cancelPendingBatch);

  return {
    renderedCount: shallowReadonly(renderedCount),
    isComplete: computed(() => renderedCount.value >= totalCount()),
  };
}

function createDefaultOptions(): GradualRenderingOptions {
  return {
    initialBatchSize: 30,
    subsequentBatchSize: 10,
    scheduleBatch: createAfterPaintScheduler(),
  };
}

/*
  Waits for the next frame and then for a fresh task, which runs the batch after that frame has
  painted rather than inside it: work done in a `requestAnimationFrame` callback delays the very
  paint it precedes. It is the same yield `main.ts` uses before mounting.

  The functions are resolved once, up front, so a pending batch never reads `window` again; under
  jsdom the environment is torn down between test files while a batch can still be queued.
*/
function createAfterPaintScheduler(): BatchScheduler {
  const setTimer = window.setTimeout.bind(window);
  const clearTimer = window.clearTimeout.bind(window);
  const requestFrame = window.requestAnimationFrame?.bind(window);
  const cancelFrame = window.cancelAnimationFrame?.bind(window);
  if (!requestFrame || !cancelFrame) {
    return (callback) => {
      const timer = setTimer(callback, 0);
      return () => clearTimer(timer);
    };
  }
  return (callback) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestFrame(() => {
      timer = setTimer(callback, 0);
    });
    return () => {
      cancelFrame(frame);
      if (timer !== undefined) {
        clearTimer(timer);
      }
    };
  };
}
