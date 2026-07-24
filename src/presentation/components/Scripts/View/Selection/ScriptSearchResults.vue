<template>
  <ScriptListPanel
    :heading="`Matches for “${queryLabel}”`"
    :groups="groups"
    :selected-script-ids="selectedScriptIds"
    :reverted-status-by-script-id="revertedStatusByScriptId"
  >
    <template #actions>
      <FlatButton
        icon="xmark"
        label="Close search"
        @click="$emit('searchCleared')"
      />
    </template>
  </ScriptListPanel>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import FlatButton from '@/presentation/components/Shared/FlatButton.vue';
import type { FilterResult } from '@/application/Context/State/Filter/Result/FilterResult';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import ScriptListPanel from './ScriptListPanel.vue';
import { createScriptGroups } from './Model/ScriptGroupFactory';
import { useSelectedScriptIds } from './UseSelectedScriptIds';
import type { ScriptGroup } from './Model/ScriptGroup';

export default defineComponent({
  components: {
    ScriptListPanel,
    FlatButton,
  },
  props: {
    filter: {
      type: Object as PropType<FilterResult>,
      required: true,
    },
    /**
     * The query as it should read in the heading, already shortened for display.
     */
    queryLabel: {
      type: String,
      required: true,
    },
  },
  emits: [
    'searchCleared',
  ],
  setup(props) {
    const { currentState } = injectKey((keys) => keys.useCollectionState);
    const { selectedScriptIds, revertedStatusByScriptId } = useSelectedScriptIds(
      injectKey((keys) => keys.useUserSelectionState),
    );

    /**
     * A matching category contributes every script it holds, mirroring how a category
     * match is presented as "everything in here is relevant".
     */
    const matchedScriptIds = computed<ReadonlySet<ExecutableId>>(() => new Set([
      ...props.filter.scriptMatches.map((script) => script.executableId),
      ...props.filter.categoryMatches.flatMap(
        (category) => category.getAllScriptsRecursively().map((script) => script.executableId),
      ),
    ]));

    /*
      Results are grouped by the category owning each match, so the group title names the
      category the setting lives in.
    */
    const groups = computed<ReadonlyArray<ScriptGroup>>(() => createScriptGroups(
      currentState.value.collection.actions,
      {
        scriptFilter: (script) => matchedScriptIds.value.has(script.executableId),
      },
    ));

    return {
      groups,
      selectedScriptIds,
      revertedStatusByScriptId,
    };
  },
});
</script>
