import type { CategoryCollection } from '@/domain/Collection/CategoryCollection';
import type { ExecutableId } from '@/domain/Executables/Identifiable';

/**
 * A top-level category as shown in the navigation rail.
 */
export interface CategoryOutlineItem {
  readonly categoryId: ExecutableId;
  readonly name: string;
  /**
   * Every script the category holds, at any depth. Kept as identifiers so selection
   * counts can be derived without walking the hierarchy on each selection change.
   */
  readonly scriptIds: ReadonlyArray<ExecutableId>;
}

export function createCategoryOutline(
  collection: CategoryCollection,
): CategoryOutlineItem[] {
  return collection.actions.map((category) => ({
    categoryId: category.executableId,
    name: category.name,
    scriptIds: category
      .getAllScriptsRecursively()
      .map((script) => script.executableId),
  }));
}
