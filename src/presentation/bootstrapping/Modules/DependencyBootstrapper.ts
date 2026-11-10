import { inject, type App } from 'vue';
import { buildContext } from '@/application/Context/ApplicationContextFactory';
import { provideDependencies } from '@/presentation/bootstrapping/DependencyProvider';
import type { IApplicationContext } from '@/application/Context/IApplicationContext';
import type { CategoryCollection } from '@/domain/Collection/CategoryCollection';
import type { Script } from '@/domain/Executables/Script/Script';
import type { Bootstrapper } from '../Bootstrapper';

/*
  The per-slice budget is what makes the warm-up an improvement rather than a relocation:
  compiling the 893 Windows scripts in one pass is a single ~610 ms task on desktop and 2-3 s on
  mobile, which lands squarely in Lighthouse's TBT window and costs more than deferring the
  compilation gained. Yielding every 25 ms keeps each task short enough that an input event never
  waits long for it.
*/
const MaxSliceDurationInMs = 25;

export class DependencyBootstrapper implements Bootstrapper {
  constructor(
    private readonly contextFactory = buildContext,
    private readonly dependencyProvider = provideDependencies,
    private readonly injector = inject,
  ) { }

  public async bootstrap(app: App): Promise<void> {
    const context = await this.contextFactory();
    this.dependencyProvider(context, {
      provide: app.provide,
      inject: this.injector,
    });
    warmUpScriptCodeOfShownCollections(context);
  }
}

/*
  Script code compiles on first read (see `ScriptFactory.ts`), which keeps it off the path to the
  first paint but moves it onto whichever interaction touches it first. Compiling in the background
  once the app is up gives the cache a head start, so a hover, a search or a selection lands on
  code that is already there.

  Only the collection on screen is warmed, because every interaction until the user switches
  operating system can only reach that one. A collection is warmed once the user switches to it,
  ahead of whatever is still queued. Warming all three up front kept the page busy for seconds
  after it loaded, for scripts most visitors never look at: some Windows scripts take over 100 ms
  each to compile with the CPU throttled 4x, and a single script cannot be split across slices, so
  each of them was a long task that Lighthouse counted as Total Blocking Time even for a visitor
  on macOS.
*/
function warmUpScriptCodeOfShownCollections(context: IApplicationContext): void {
  const warmUp = createScriptCodeWarmUp();
  warmUp(context.state.collection);
  context.contextChanged.on((event) => warmUp(event.newState.collection));
}

function createScriptCodeWarmUp(): (collection: CategoryCollection) => void {
  const queuedCollections = new Set<CategoryCollection>();
  const schedule = createIdleScheduler();
  let pending: readonly Script[] = [];
  let index = 0;
  let isSliceScheduled = false;
  const warmUpSlice = (deadline?: IdleDeadline): void => {
    isSliceScheduled = false;
    const sliceStart = performance.now();
    while (
      index < pending.length
      && performance.now() - sliceStart < MaxSliceDurationInMs
      && (deadline?.timeRemaining() ?? MaxSliceDurationInMs) > 0
    ) {
      warmUpScript(pending[index]);
      index += 1;
    }
    scheduleSliceIfPending();
  };
  function scheduleSliceIfPending(): void {
    if (index < pending.length && !isSliceScheduled) {
      isSliceScheduled = true;
      schedule(warmUpSlice);
    }
  }
  return (collection) => {
    if (queuedCollections.has(collection)) {
      return;
    }
    queuedCollections.add(collection);
    pending = [...collection.getAllScripts(), ...pending.slice(index)];
    index = 0;
    scheduleSliceIfPending();
  };
}

function warmUpScript(script: Script): void {
  try {
    /*
      `canRevert()` reads `script.code`, which is what runs and memoizes the compilation. It is
      also the exact read the first render performs for every row it draws (`ScriptGroupFactory`),
      so warming through it warms precisely the call being paid for.
    */
    script.canRevert();
  } catch {
    /*
      A malformed script must not stop the warm-up for the healthy ones queued behind it, and
      must not become an uncaught error for a script the user may never open. The failure is
      memoized by `CollectionScript`, so the identical error is thrown again the moment the script
      is genuinely used (a render, a search, an export), where it is reported in context.
    */
  }
}

/*
  Safari gained `requestIdleCallback` only in 16.4, and `.browserslistrc` ("> 1%, last 2 versions,
  not dead") still covers older Safari builds. Falling back to a zero-delay timeout keeps the
  warm-up running there; it yields to the event loop between slices just the same, it simply does
  not know how much idle time is left and relies on the 25 ms budget alone.

  The scheduling function is resolved once, up front, rather than read off `window` inside each
  slice. A slice re-schedules itself, so a per-slice lookup outlives whatever set it up: under
  jsdom the environment is torn down between test files while a warm-up is still queued, and the
  next slice then throws `ReferenceError: window is not defined` as an unhandled error. Holding the
  function directly keeps the chain self-contained.
*/
function createIdleScheduler(): (slice: (deadline?: IdleDeadline) => void) => void {
  const scheduleWhenIdle = window.requestIdleCallback?.bind(window);
  if (scheduleWhenIdle) {
    return (slice) => { scheduleWhenIdle(slice); };
  }
  const scheduleSoon = window.setTimeout.bind(window);
  return (slice) => { scheduleSoon(slice, 0); };
}
