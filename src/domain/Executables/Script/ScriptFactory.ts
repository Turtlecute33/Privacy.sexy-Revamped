import { RecommendationLevel } from './RecommendationLevel';
import type { ScriptCode } from './Code/ScriptCode';
import type { Script } from './Script';
import type { ExecutableId } from '../Identifiable';

export interface ScriptInitParameters {
  readonly executableId: ExecutableId;
  readonly name: string;
  readonly code: () => ScriptCode;
  readonly docs: ReadonlyArray<string>;
  readonly level?: RecommendationLevel;
}

export type ScriptFactory = (
  parameters: ScriptInitParameters,
) => Script;

export const createScript: ScriptFactory = (parameters) => {
  return new CollectionScript(parameters);
};

/*
  Compiling the shell code of every script up-front costs 649 ms (desktop) and produces ~12.9 M
  characters for the 1,163 scripts of the three collections, all of it before the first paint,
  while only 85 of those scripts are on screen then. `code` is therefore handed to the factory as
  an unevaluated thunk and run at most once, on first read.

  Memoizing inside a getter is safe under Vue because collection state is held in `shallowRef` and
  handed out through `shallowReadonly` (see `UseCollectionState.ts`), so a `Script` is never
  wrapped in a reactive proxy and the write below can neither be tracked nor trigger an effect.
*/
class CollectionScript implements Script {
  public readonly executableId: ExecutableId;

  public readonly name: string;

  public readonly docs: ReadonlyArray<string>;

  public readonly level?: RecommendationLevel;

  private readonly compileCode: () => ScriptCode;

  private compilation?: CodeCompilation;

  constructor(parameters: ScriptInitParameters) {
    this.executableId = parameters.executableId;
    this.name = parameters.name;
    this.compileCode = parameters.code;
    this.docs = parameters.docs;
    this.level = parameters.level;
    validateLevel(parameters.level);
  }

  /*
    A failure is memoized just like a result, and the very same error object is rethrown on every
    later read. Compilation is deterministic, so a retry can only fail again: caching it keeps a
    malformed script from recompiling on every render, hover and keystroke, and keeps the error
    identity stable so callers comparing or deduplicating errors see one failure, not one per read.
  */
  public get code(): ScriptCode {
    this.compilation ??= compile(this.compileCode);
    if ('error' in this.compilation) {
      throw this.compilation.error;
    }
    return this.compilation.code;
  }

  public canRevert(): boolean {
    return Boolean(this.code.revert);
  }
}

type CodeCompilation =
  | { readonly code: ScriptCode }
  | { readonly error: unknown };

function compile(compileCode: () => ScriptCode): CodeCompilation {
  try {
    return { code: compileCode() };
  } catch (error) {
    return { error };
  }
}

function validateLevel(level?: RecommendationLevel) {
  if (level !== undefined && !(level in RecommendationLevel)) {
    throw new Error(`invalid level: ${level}`);
  }
}
