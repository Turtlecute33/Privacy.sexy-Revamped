import {
  describe, it, expect, afterEach, vi,
} from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import {
  useGradualRendering, type BatchScheduler, type GradualRenderingOptions,
} from '@/presentation/components/Scripts/View/Selection/UseGradualRendering';

describe('useGradualRendering', () => {
  it('renders the initial batch immediately', () => {
    // arrange
    const expectedCount = 3;
    const context = new TestContext()
      .withTotalCount(10)
      .withOptions({ initialBatchSize: expectedCount });

    // act
    const { renderedCount } = context.use();

    // assert
    expect(renderedCount.value).to.equal(expectedCount);
  });

  describe('default initial batch', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('renders as many rows as the window can show', () => {
      // arrange
      const rowMinimumHeightInPx = 46;
      const expectedCount = 20;
      vi.stubGlobal('innerHeight', expectedCount * rowMinimumHeightInPx);
      // act
      const renderedCount = useWithDefaultOptions(100);
      // assert
      expect(renderedCount).to.equal(expectedCount);
    });

    it('renders a minimum number of rows in a very short window', () => {
      // arrange
      const expectedCount = 10;
      vi.stubGlobal('innerHeight', 50);
      // act
      const renderedCount = useWithDefaultOptions(100);
      // assert
      expect(renderedCount).to.equal(expectedCount);
    });

    function useWithDefaultOptions(totalCount: number): number {
      const scope = effectScope();
      const renderedCount = scope.run(() => useGradualRendering(
        () => totalCount,
        () => undefined,
      ).renderedCount.value);
      scope.stop(); // cancels the batches that would follow
      return renderedCount ?? 0;
    }
  });

  it('renders a short list at once without scheduling anything', () => {
    // arrange
    const totalCount = 2;
    const context = new TestContext()
      .withTotalCount(totalCount)
      .withOptions({ initialBatchSize: 5 });

    // act
    const { renderedCount, isComplete } = context.use();

    // assert
    expect(renderedCount.value).to.equal(totalCount);
    expect(isComplete.value).to.equal(true);
    expect(context.scheduler.pendingCount).to.equal(0);
  });

  it('adds one subsequent batch per scheduled task', () => {
    // arrange
    const context = new TestContext()
      .withTotalCount(10)
      .withOptions({ initialBatchSize: 3, subsequentBatchSize: 2 });
    const { renderedCount } = context.use();

    // act
    context.scheduler.runNext();

    // assert
    expect(renderedCount.value).to.equal(5);
    expect(context.scheduler.pendingCount).to.equal(1);
  });

  it('stops at the total and stops scheduling once everything is rendered', () => {
    // arrange
    const totalCount = 10;
    const context = new TestContext()
      .withTotalCount(totalCount)
      .withOptions({ initialBatchSize: 3, subsequentBatchSize: 4 });
    const { renderedCount, isComplete } = context.use();

    // act
    context.scheduler.runNext();
    const isCompleteBeforeLastBatch = isComplete.value;
    context.scheduler.runNext();

    // assert
    expect(isCompleteBeforeLastBatch).to.equal(false);
    expect(renderedCount.value).to.equal(totalCount);
    expect(isComplete.value).to.equal(true);
    expect(context.scheduler.pendingCount).to.equal(0);
  });

  it('starts over from the initial batch when the list changes', async () => {
    // arrange
    const context = new TestContext()
      .withTotalCount(20)
      .withOptions({ initialBatchSize: 3, subsequentBatchSize: 5 });
    const { renderedCount } = context.use();
    context.scheduler.runNext();
    context.scheduler.runNext();

    // act
    context.restartSource.value = {};
    await nextTick();

    // assert
    expect(renderedCount.value).to.equal(3);
    expect(context.scheduler.cancelledCount).to.equal(1);
    expect(context.scheduler.pendingCount).to.equal(1);
  });

  it('renders the new list in full when it is short', async () => {
    // arrange
    const context = new TestContext()
      .withTotalCount(20)
      .withOptions({ initialBatchSize: 3 });
    const { renderedCount, isComplete } = context.use();

    // act
    context.totalCount.value = 1;
    context.restartSource.value = {};
    await nextTick();

    // assert
    expect(renderedCount.value).to.equal(1);
    expect(isComplete.value).to.equal(true);
    expect(context.scheduler.pendingCount).to.equal(0);
  });

  it('cancels the pending batch when its owner is disposed', () => {
    // arrange
    const context = new TestContext()
      .withTotalCount(20)
      .withOptions({ initialBatchSize: 3 });
    context.use();

    // act
    context.dispose();

    // assert
    expect(context.scheduler.cancelledCount).to.equal(1);
    expect(context.scheduler.pendingCount).to.equal(0);
  });
});

interface BatchSchedulerStub {
  readonly schedule: BatchScheduler;
  readonly pendingCount: number;
  readonly cancelledCount: number;
  runNext(): void;
}

function createBatchSchedulerStub(): BatchSchedulerStub {
  const pending = new Array<() => void>();
  let cancelledCount = 0;
  return {
    schedule: (callback) => {
      pending.push(callback);
      return () => {
        const index = pending.indexOf(callback);
        if (index >= 0) {
          pending.splice(index, 1);
          cancelledCount += 1;
        }
      };
    },
    get pendingCount() { return pending.length; },
    get cancelledCount() { return cancelledCount; },
    runNext: () => {
      const next = pending.shift();
      if (!next) {
        throw new Error('Nothing is scheduled.');
      }
      next();
    },
  };
}

class TestContext {
  public readonly scheduler = createBatchSchedulerStub();

  public readonly totalCount = shallowRef(0);

  public readonly restartSource = shallowRef<object>({});

  private options: Partial<GradualRenderingOptions> = {};

  private readonly scope = effectScope();

  public withTotalCount(totalCount: number): this {
    this.totalCount.value = totalCount;
    return this;
  }

  public withOptions(options: Partial<GradualRenderingOptions>): this {
    this.options = options;
    return this;
  }

  public use(): ReturnType<typeof useGradualRendering> {
    const result = this.scope.run(() => useGradualRendering(
      () => this.totalCount.value,
      () => this.restartSource.value,
      {
        initialBatchSize: 1,
        subsequentBatchSize: 1,
        ...this.options,
        scheduleBatch: this.scheduler.schedule,
      },
    ));
    if (!result) {
      throw new Error('The effect scope did not run.');
    }
    return result;
  }

  public dispose(): void {
    this.scope.stop();
  }
}
