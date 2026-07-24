import { computed, shallowReadonly } from 'vue';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import type { useUserSelectionState } from '@/presentation/components/Shared/Hooks/UseUserSelectionState';

/**
 * Exposes the current selection as lookups, so rows and group headers can resolve their
 * own state in constant time instead of scanning the selected scripts array each time.
 */
export function useSelectedScriptIds(
  useSelectionStateHook: ReturnType<typeof useUserSelectionState>,
) {
  const { currentSelection } = useSelectionStateHook;

  const revertedStatusByScriptId = computed<ReadonlyMap<ExecutableId, boolean>>(
    () => new Map(
      currentSelection.value.scripts.selectedScripts.map(
        (selected) => [selected.id, selected.revert],
      ),
    ),
  );

  const selectedScriptIds = computed<ReadonlySet<ExecutableId>>(
    () => new Set(revertedStatusByScriptId.value.keys()),
  );

  return {
    selectedScriptIds: shallowReadonly(selectedScriptIds),
    revertedStatusByScriptId: shallowReadonly(revertedStatusByScriptId),
  };
}
