import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ApplicationContextStub } from '@tests/unit/shared/Stubs/ApplicationContextStub';
import { DependencyBootstrapper } from '@/presentation/bootstrapping/Modules/DependencyBootstrapper';
import type { IApplicationContext } from '@/application/Context/IApplicationContext';
import { VueDependencyInjectionApiStub } from '@tests/unit/shared/Stubs/VueDependencyInjectionApiStub';
import { buildContext } from '@/application/Context/ApplicationContextFactory';
import { provideDependencies } from '@/presentation/bootstrapping/DependencyProvider';
import { ApplicationStub } from '@tests/unit/shared/Stubs/ApplicationStub';
import { CategoryCollectionStub } from '@tests/unit/shared/Stubs/CategoryCollectionStub';
import { CategoryCollectionStateStub } from '@tests/unit/shared/Stubs/CategoryCollectionStateStub';
import { CategoryStub } from '@tests/unit/shared/Stubs/CategoryStub';
import { ScriptStub } from '@tests/unit/shared/Stubs/ScriptStub';
import type { CategoryCollection } from '@/domain/Collection/CategoryCollection';
import type { Script } from '@/domain/Executables/Script/Script';
import type { ScriptCode } from '@/domain/Executables/Script/Code/ScriptCode';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import type { App, inject } from 'vue';

describe('DependencyBootstrapper', () => {
  describe('bootstrap', () => {
    it('calls the contextFactory', async () => {
      // arrange
      const { mockContext, mockApp } = createMocks();
      let contextFactoryCalled = false;
      const sut = new DependencyBootstrapperBuilder()
        .withContextFactory(async () => {
          contextFactoryCalled = true;
          return mockContext;
        })
        .build();
      // act
      await sut.bootstrap(mockApp);
      // assert
      expect(contextFactoryCalled).to.equal(true);
    });
    it('provides correct context to dependency provider', async () => {
      // arrange
      const { mockContext, mockApp } = createMocks();
      const expectedContext = mockContext;
      let actualContext: IApplicationContext | undefined;
      const sut = new DependencyBootstrapperBuilder()
        .withContextFactory(async () => expectedContext)
        .withDependencyProvider((...params) => {
          const [context] = params;
          actualContext = context;
        })
        .build();
      // act
      await sut.bootstrap(mockApp);
      // assert
      expect(actualContext).to.equal(expectedContext);
    });
    it('provides correct provide function to dependency provider', async () => {
      // arrange
      const { mockApp, provideMock } = createMocks();
      const expectedProvide = provideMock;
      let actualProvide: typeof expectedProvide | undefined;
      const sut = new DependencyBootstrapperBuilder()
        .withDependencyProvider((...params) => {
          actualProvide = params[1]?.provide;
        })
        .build();
      // act
      await sut.bootstrap(mockApp);
      // assert
      expect(actualProvide).to.equal(expectedProvide);
    });
    it('provides correct inject function to dependency provider', async () => {
      // arrange
      const { mockApp } = createMocks();
      const expectedInjector = new VueDependencyInjectionApiStub().inject;
      let actualInjector: Injector | undefined;
      const sut = new DependencyBootstrapperBuilder()
        .withInjector(expectedInjector)
        .withDependencyProvider((...params) => {
          actualInjector = params[1]?.inject;
        })
        .build();
      // act
      await sut.bootstrap(mockApp);
      // assert
      expect(actualInjector).to.equal(expectedInjector);
    });
    describe('script code warm-up', () => {
      /*
        Every assertion here guards an optimization that is invisible when it breaks: script code
        compiles lazily on first read anyway, so a warm-up that warms nothing, stops after its
        first slice or never yields leaves a fully working application behind. Only the timing
        changes, and no other test can see timing.

        jsdom exposes no `requestIdleCallback`, so the bootstrapper resolves its scheduler to the
        `window.setTimeout` fallback and fake timers drive the whole chain. The two tests that need
        an idle deadline install one themselves.
      */
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
      });

      it('compiles the code of every script in every collection', async () => {
        // arrange
        const log = createScriptCodeReadLog();
        const activeScriptIds = ['active-1', 'active-2'];
        const otherScriptIds = ['other-1', 'other-2', 'other-3'];
        const expectedScriptIds = [...activeScriptIds, ...otherScriptIds];
        const activeCollection = createCollectionWithScripts(log.createScripts(activeScriptIds));
        const context = createContext(activeCollection, [
          createCollectionWithScripts(log.createScripts(otherScriptIds)),
        ]);
        // act
        await bootstrapWith(context);
        vi.runAllTimers();
        // assert
        expect([...log.readScriptIds].sort()).to.deep.equal([...expectedScriptIds].sort());
      });

      it('compiles the collection the app opened on before the others', async () => {
        // arrange
        const log = createScriptCodeReadLog();
        const expectedFirstScriptIds = ['active-1', 'active-2'];
        const activeCollection = createCollectionWithScripts(
          log.createScripts(expectedFirstScriptIds),
        );
        /*
          The active collection is deliberately last in `app.collections`, because a fixture that
          already listed it first could not tell hoisting apart from plain iteration order.
        */
        const context = createContext(activeCollection, [
          createCollectionWithScripts(log.createScripts(['other-1', 'other-2'])),
        ]);
        // act
        await bootstrapWith(context);
        vi.runAllTimers();
        // assert
        const actualFirstScriptIds = log.readScriptIds.slice(0, expectedFirstScriptIds.length);
        expect(actualFirstScriptIds).to.deep.equal(expectedFirstScriptIds);
      });

      it('keeps compiling after a script fails to compile', async () => {
        // arrange
        const log = createScriptCodeReadLog();
        const expectedScriptIds = ['before-failure', 'failing', 'after-failure'];
        const context = createContext(createCollectionWithScripts([
          log.createScript('before-failure'),
          log.createScript('failing', () => {
            throw new Error(`[${DependencyBootstrapper.name}] compilation failure under test`);
          }),
          log.createScript('after-failure'),
        ]), []);
        // act
        await bootstrapWith(context);
        vi.runAllTimers();
        // assert
        expect(log.readScriptIds).to.deep.equal(expectedScriptIds);
      });

      /*
        Guards the tail of the slice, `if (index < pending.length) schedule(warmUpSlice)`. Dropping
        it compiles the first slice and abandons the rest, which is indistinguishable from a
        working warm-up unless a test both caps a slice and looks at what happens afterwards.
      */
      it('yields with work still pending and resumes in a later slice', async () => {
        // arrange
        const scriptsPerSlice = 2;
        const log = createScriptCodeReadLog();
        const expectedScriptIds = ['first', 'second', 'third', 'fourth', 'fifth'];
        const context = createContext(
          createCollectionWithScripts(log.createScripts(expectedScriptIds)),
          [],
        );
        stubIdleCallback(() => createDeadlineAllowingScripts(scriptsPerSlice));
        // act
        await bootstrapWith(context);
        vi.advanceTimersToNextTimer();
        const readScriptIdsAfterFirstSlice = [...log.readScriptIds];
        vi.runAllTimers();
        // assert
        expect(readScriptIdsAfterFirstSlice)
          .to.deep.equal(expectedScriptIds.slice(0, scriptsPerSlice));
        expect(log.readScriptIds).to.deep.equal(expectedScriptIds);
      });

      /*
        The browser may hand a slice a deadline with nothing left on it. jsdom never hands over a
        deadline at all, so this is the only test that exercises the `deadline?.timeRemaining()`
        side of the budget check: the slice has to compile nothing and still come back for the
        queue, rather than either ignoring the deadline or abandoning the work on one unlucky
        callback.
      */
      it('compiles nothing in a slice the browser gives no idle time', async () => {
        // arrange
        const log = createScriptCodeReadLog();
        const expectedScriptIds = ['first', 'second'];
        const context = createContext(
          createCollectionWithScripts(log.createScripts(expectedScriptIds)),
          [],
        );
        let isFirstSlice = true;
        stubIdleCallback(() => {
          const allowedScripts = isFirstSlice ? 0 : expectedScriptIds.length;
          isFirstSlice = false;
          return createDeadlineAllowingScripts(allowedScripts);
        });
        // act
        await bootstrapWith(context);
        vi.advanceTimersToNextTimer();
        const readScriptIdsAfterFirstSlice = [...log.readScriptIds];
        vi.runAllTimers();
        // assert
        expect(readScriptIdsAfterFirstSlice).to.deep.equal([]);
        expect(log.readScriptIds).to.deep.equal(expectedScriptIds);
      });

      it('schedules nothing when no collection has scripts', async () => {
        // arrange
        const context = createContext(new CategoryCollectionStub(), [
          new CategoryCollectionStub(),
        ]);
        // act
        await bootstrapWith(context);
        // assert
        expect(vi.getTimerCount()).to.equal(0);
      });
    });
  });
});

function createMocks() {
  const provideMock = new VueDependencyInjectionApiStub().provide;
  const mockContext = new ApplicationContextStub();
  const mockApp = {
    provide: provideMock,
  } as unknown as App;
  return { mockContext, mockApp, provideMock };
}

async function bootstrapWith(context: IApplicationContext): Promise<void> {
  const { mockApp } = createMocks();
  const sut = new DependencyBootstrapperBuilder()
    .withContextFactory(async () => context)
    .build();
  await sut.bootstrap(mockApp);
}

function createContext(
  activeCollection: CategoryCollection,
  otherCollections: readonly CategoryCollection[],
): IApplicationContext {
  const context = new ApplicationContextStub()
    .withState(new CategoryCollectionStateStub().withCollection(activeCollection));
  context.app = new ApplicationStub()
    .withCollections(...otherCollections, activeCollection);
  return context;
}

function createCollectionWithScripts(scripts: readonly Script[]): CategoryCollection {
  return new CategoryCollectionStub()
    .withAction(new CategoryStub(`[${createCollectionWithScripts.name}] category`)
      .withScripts(...scripts));
}

/*
  Compiling a script leaves no observable state: the result is memoized inside the script and a
  warmed read is indistinguishable from a cold one. The read itself is therefore the only evidence
  that the warm-up ran at all, so the scripts under test replace `code` — the property
  `canRevert()` reads, and the one production compiles through — with a recording getter.
*/
function createScriptCodeReadLog() {
  const readScriptIds = new Array<ExecutableId>();
  function createScript(executableId: ExecutableId, onRead?: () => void): Script {
    const script = new ScriptStub(executableId);
    const { code } = script;
    Object.defineProperty(script, 'code', {
      get: (): ScriptCode => {
        readScriptIds.push(executableId);
        onRead?.();
        return code;
      },
    });
    return script;
  }
  return {
    readScriptIds,
    createScript,
    createScripts: (executableIds: readonly ExecutableId[]): readonly Script[] => executableIds
      .map((executableId) => createScript(executableId)),
  };
}

function stubIdleCallback(createDeadline: () => IdleDeadline): void {
  vi.stubGlobal(
    'requestIdleCallback',
    (callback: IdleRequestCallback) => window.setTimeout(() => callback(createDeadline()), 0),
  );
}

/*
  The warm-up re-reads `timeRemaining()` on every iteration and only compares it against zero, so a
  deadline that reports one millisecond less on each check lets exactly `scriptCount` scripts
  through before the slice has to yield.
*/
function createDeadlineAllowingScripts(scriptCount: number): IdleDeadline {
  let remainingScripts = scriptCount;
  return {
    didTimeout: false,
    timeRemaining: () => {
      const timeRemaining = remainingScripts;
      remainingScripts -= 1;
      return timeRemaining;
    },
  };
}

type Injector = typeof inject;
type Provider = typeof provideDependencies;
type ContextFactory = typeof buildContext;

class DependencyBootstrapperBuilder {
  private contextFactory: ContextFactory = () => Promise.resolve(new ApplicationContextStub());

  private dependencyProvider: Provider = () => new VueDependencyInjectionApiStub().provide;

  private injector: Injector = () => new VueDependencyInjectionApiStub().inject;

  public withContextFactory(contextFactory: ContextFactory): this {
    this.contextFactory = contextFactory;
    return this;
  }

  public withInjector(injector: Injector): this {
    this.injector = injector;
    return this;
  }

  public withDependencyProvider(dependencyProvider: Provider): this {
    this.dependencyProvider = dependencyProvider;
    return this;
  }

  public build(): DependencyBootstrapper {
    return new DependencyBootstrapper(
      this.contextFactory,
      this.dependencyProvider,
      this.injector,
    );
  }
}
