import type { Category } from '@/domain/Executables/Category/Category';
import type { Script } from '@/domain/Executables/Script/Script';
import type { ScriptGroup, ScriptGroupItem } from './ScriptGroup';

export interface ScriptGroupCreationOptions {
  /**
   * Name for the group holding a root's own scripts, the ones not filed under any
   * subcategory. Set it where the root's name is already shown elsewhere, so the group
   * does not repeat it verbatim right underneath.
   */
  readonly rootGroupName?: string;
  /**
   * Restricts the result to the scripts passing this predicate. Groups left without
   * scripts are dropped.
   */
  readonly scriptFilter?: (script: Script) => boolean;
}

export function createScriptGroups(
  roots: ReadonlyArray<Category>,
  options: ScriptGroupCreationOptions,
): ScriptGroup[] {
  const groups = new Array<ScriptGroup>();
  const keepScript = options.scriptFilter ?? (() => true);

  function collect(category: Category): void {
    const scripts = category.scripts.filter(keepScript);
    if (scripts.length > 0) {
      groups.push({
        categoryId: category.executableId,
        name: category.name,
        docs: category.docs,
        scripts: scripts.map(convertToGroupItem),
      });
    }
    category.subcategories.forEach(collect);
  }

  roots.forEach((root) => {
    const rootScripts = root.scripts.filter(keepScript);
    if (rootScripts.length > 0) {
      groups.push({
        categoryId: root.executableId,
        name: options.rootGroupName ?? root.name,
        docs: root.docs,
        scripts: rootScripts.map(convertToGroupItem),
      });
    }
    root.subcategories.forEach(collect);
  });

  return groups;
}

function convertToGroupItem(script: Script): ScriptGroupItem {
  return {
    scriptId: script.executableId,
    name: script.name,
    docs: script.docs,
    isReversible: script.canRevert(),
  };
}
