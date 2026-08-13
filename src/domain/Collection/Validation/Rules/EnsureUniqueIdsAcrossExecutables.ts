import type { Identifiable } from '@/domain/Executables/Identifiable';
import type { CategoryCollectionValidator } from '../CategoryCollectionValidator';

export const ensureUniqueIdsAcrossExecutables: CategoryCollectionValidator = (
  context,
) => {
  const allExecutables: readonly Identifiable[] = [
    ...context.allCategories,
    ...context.allScripts,
  ];
  ensureNoDuplicateIds(allExecutables);
};

function ensureNoDuplicateIds(
  executables: readonly Identifiable[],
) {
  const duplicateExecutables = getExecutablesWithDuplicateIds(executables);
  if (duplicateExecutables.length === 0) {
    return;
  }
  const formattedDuplicateIds = duplicateExecutables.map(
    (executable) => `"${executable.executableId}"`,
  ).join(', ');
  throw new Error(`Duplicate executable IDs found: ${formattedDuplicateIds}`);
}

/*
  Tracking seen IDs in a `Set` keeps this linear. Scanning the array for each executable instead
  costs a quadratic number of comparisons, which is measurable on the Windows collection where
  there are thousands of executables and this runs on every application load.
*/
function getExecutablesWithDuplicateIds(
  executables: readonly Identifiable[],
): Identifiable[] {
  const seenIds = new Set<Identifiable['executableId']>();
  return executables.filter((executable) => {
    if (seenIds.has(executable.executableId)) {
      return true;
    }
    seenIds.add(executable.executableId);
    return false;
  });
}
