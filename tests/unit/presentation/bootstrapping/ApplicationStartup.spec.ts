import { describe, it, expect } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import {
  mountReportingErrors, startApplication, StartupFailedEventType,
  type StartupEnvironment, type StartupFailedEventDetail, type StartupSteps,
} from '@/presentation/bootstrapping/ApplicationStartup';
import { expectExists } from '@tests/shared/Assertions/ExpectExists';

describe('ApplicationStartup', () => {
  describe('startApplication', () => {
    it('bootstraps before mounting', async () => {
      // arrange
      const calls = new Array<string>();
      const context = new TestContext().withSteps({
        bootstrap: async () => { calls.push('bootstrap'); },
        mount: async () => { calls.push('mount'); },
      });

      // act
      await context.start();

      // assert
      expect(calls).to.deep.equal(['bootstrap', 'mount']);
    });

    it('reports nothing when the app starts', async () => {
      // arrange
      const context = new TestContext();

      // act
      await context.start();

      // assert
      expect(context.reportedFailures).to.have.lengthOf(0);
      expect(context.loggedErrors).to.have.lengthOf(0);
    });

    it('reports a failed bootstrap without mounting', async () => {
      // arrange
      let isMounted = false;
      const context = new TestContext().withSteps({
        bootstrap: () => Promise.reject(new Error('Bootstrap failed')),
        mount: async () => { isMounted = true; },
      });

      // act
      await context.start();

      // assert
      expect(isMounted).to.equal(false);
      expect(context.reportedFailures).to.deep.equal([{ isRecoverableByReload: false }]);
    });

    it('reports a failed mount', async () => {
      // arrange
      const context = new TestContext().withSteps({
        mount: () => Promise.reject(new Error('Mount failed')),
      });

      // act
      await context.start();

      // assert
      expect(context.reportedFailures).to.deep.equal([{ isRecoverableByReload: false }]);
    });

    it('logs the error it reports', async () => {
      // arrange
      const expectedError = new Error('Bootstrap failed');
      const context = new TestContext().withSteps({
        bootstrap: () => Promise.reject(expectedError),
      });

      // act
      await context.start();

      // assert
      expect(context.loggedErrors.flat()).to.include(expectedError);
    });

    describe('telling whether a reload can help', () => {
      const failedModuleLoadMessages: readonly string[] = [
        'Failed to fetch dynamically imported module: https://example.com/assets/chunk-a1.js',
        'error loading dynamically imported module: https://example.com/assets/chunk-a1.js',
        'Importing a module script failed.',
        'Unable to preload CSS for /assets/chunk-a1.css',
      ];
      failedModuleLoadMessages.forEach((message) => {
        it(`given a chunk that failed to load: "${message}"`, async () => {
          // arrange
          const context = new TestContext().withSteps({
            bootstrap: () => Promise.reject(new TypeError(message)),
          });

          // act
          await context.start();

          // assert
          expect(context.reportedFailures).to.deep.equal([{ isRecoverableByReload: true }]);
        });
      });

      it('given a preload error reported by Vite while starting', async () => {
        // arrange
        const context = new TestContext();
        context.withSteps({
          bootstrap: async () => {
            context.window.dispatchEvent(new Event('vite:preloadError'));
            throw new Error('Unrelated wording');
          },
        });

        // act
        await context.start();

        // assert
        expect(context.reportedFailures).to.deep.equal([{ isRecoverableByReload: true }]);
      });

      it('ignores preload errors from before the start', async () => {
        // arrange
        const context = new TestContext().withSteps({
          bootstrap: () => Promise.reject(new Error('Bootstrap failed')),
        });
        context.window.dispatchEvent(new Event('vite:preloadError'));

        // act
        await context.start();

        // assert
        expect(context.reportedFailures).to.deep.equal([{ isRecoverableByReload: false }]);
      });
    });

    it('stops watching for preload errors once started', async () => {
      // arrange
      const context = new TestContext();

      // act
      await context.start();

      // assert
      expect(context.window.listenerCount).to.equal(0);
    });
  });

  describe('mountReportingErrors', () => {
    it('throws an error raised while mounting', () => {
      // arrange
      const expectedError = new Error('Setup failed');
      const app = createTestApp(() => {
        throw expectedError;
      });

      // act
      const act = () => mountReportingErrors(app, () => app.mount(document.createElement('div')));

      // assert
      expect(act).to.throw(expectedError);
    });

    it('mounts an app that renders', () => {
      // arrange
      const container = document.createElement('div');
      const app = createTestApp();

      // act
      mountReportingErrors(app, () => app.mount(container));

      // assert
      expect(container.textContent).to.equal('Rendered');
    });

    it('restores the error handler once mounted', () => {
      // arrange
      const expectedHandler = () => { /* stays in place after mounting */ };
      const app = createTestApp();
      app.config.errorHandler = expectedHandler;

      // act
      mountReportingErrors(app, () => app.mount(document.createElement('div')));

      // assert
      expect(app.config.errorHandler).to.equal(expectedHandler);
    });
  });
});

function createTestApp(setup?: () => void) {
  return createApp(defineComponent({
    setup,
    render: () => h('p', 'Rendered'),
  }));
}

interface WindowStub extends EventTarget {
  readonly listenerCount: number;
}

function createWindowStub(): WindowStub {
  const target = new EventTarget();
  let listenerCount = 0;
  return {
    get listenerCount() { return listenerCount; },
    addEventListener: (...args: Parameters<EventTarget['addEventListener']>) => {
      listenerCount += 1;
      target.addEventListener(...args);
    },
    removeEventListener: (...args: Parameters<EventTarget['removeEventListener']>) => {
      listenerCount -= 1;
      target.removeEventListener(...args);
    },
    dispatchEvent: (event) => target.dispatchEvent(event),
  };
}

class TestContext {
  public readonly window = createWindowStub();

  public readonly loggedErrors = new Array<unknown[]>();

  public readonly reportedFailures = new Array<StartupFailedEventDetail>();

  private steps: StartupSteps = {
    bootstrap: () => Promise.resolve(),
    mount: () => Promise.resolve(),
  };

  public withSteps(steps: Partial<StartupSteps>): this {
    this.steps = { ...this.steps, ...steps };
    return this;
  }

  public start(): Promise<void> {
    const document = new EventTarget();
    document.addEventListener(StartupFailedEventType, (event) => {
      expectExists(event);
      this.reportedFailures.push((event as CustomEvent<StartupFailedEventDetail>).detail);
    });
    const environment: StartupEnvironment = {
      window: this.window,
      document,
      logError: (...params) => this.loggedErrors.push(params),
    };
    return startApplication(this.steps, environment);
  }
}
