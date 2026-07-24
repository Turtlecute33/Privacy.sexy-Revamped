import type { ExecutableId } from '@/domain/Executables/Identifiable';

/**
 * A single selectable script, flattened out of the category hierarchy.
 */
export interface ScriptGroupItem {
  readonly scriptId: ExecutableId;
  readonly name: string;
  readonly docs: ReadonlyArray<string>;
  readonly isReversible: boolean;
}

/**
 * The scripts that a single category holds directly.
 *
 * The collection nests categories up to five levels deep. Rendering that structure
 * verbatim forces the user to expand branch after branch before reaching anything
 * actionable. Groups flatten it instead: every category holding scripts becomes one
 * flat section titled by its own name, whatever depth it sits at.
 */
export interface ScriptGroup {
  readonly categoryId: ExecutableId;
  readonly name: string;
  readonly docs: ReadonlyArray<string>;
  readonly scripts: ReadonlyArray<ScriptGroupItem>;
}
