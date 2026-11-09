<template>
  <div class="explorer">
    <CategoryRail
      class="explorer__rail"
      :items="outlineItems"
      :selected-script-ids="selectedScriptIds"
      :active-category-id="activeItem?.categoryId"
      @category-activated="openCategoryId = $event"
    />
    <!--
      Remounting per category resets the list scroll position, so opening a category
      always starts from its first group.
    -->
    <ScriptListPanel
      v-if="activeItem"
      :key="activeItem.categoryId"
      class="explorer__panel"
      :heading="activeItem.name"
      :groups="groups"
      :selected-script-ids="selectedScriptIds"
      :reverted-status-by-script-id="revertedStatusByScriptId"
    >
      <template #actions>
        <span class="explorer__count">
          <strong>{{ activeSelectedCount }}</strong> of {{ activeItem.scriptIds.length }} selected
        </span>
      </template>
    </ScriptListPanel>
  </div>
</template>

<script lang="ts">
import {
  computed, defineComponent, useModel, type PropType,
} from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import CategoryRail from './CategoryRail.vue';
import ScriptListPanel from './ScriptListPanel.vue';
import { createCategoryOutline, type CategoryOutlineItem } from './Model/CategoryOutline';
import { createScriptGroups } from './Model/ScriptGroupFactory';
import { useSelectedScriptIds } from './UseSelectedScriptIds';
import type { ScriptGroup } from './Model/ScriptGroup';

export default defineComponent({
  components: {
    CategoryRail,
    ScriptListPanel,
  },
  props: {
    /**
     * The open category, bound with `v-model` so that it can outlive this component: the scripts
     * view unmounts the explorer while search results are shown, and a value held only in here
     * reset to the first category whenever a search was closed. Kept locally when not bound.
     */
    activeCategoryId: {
      type: String as PropType<ExecutableId>,
      default: undefined,
    },
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    'update:activeCategoryId': (categoryId: ExecutableId | undefined) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props) {
    const { currentState } = injectKey((keys) => keys.useCollectionState);
    const { selectedScriptIds, revertedStatusByScriptId } = useSelectedScriptIds(
      injectKey((keys) => keys.useUserSelectionState),
    );

    const outlineItems = computed<ReadonlyArray<CategoryOutlineItem>>(
      () => createCategoryOutline(currentState.value.collection),
    );

    const openCategoryId = useModel(props, 'activeCategoryId');

    /*
      Falling back to the first category covers both the initial render and switching to
      an operating system whose collection does not have the previously opened category.
    */
    const activeItem = computed<CategoryOutlineItem | undefined>(
      () => outlineItems.value.find((item) => item.categoryId === openCategoryId.value)
        ?? outlineItems.value[0],
    );

    const groups = computed<ReadonlyArray<ScriptGroup>>(() => {
      const item = activeItem.value;
      if (!item) {
        return [];
      }
      const category = currentState.value.collection.getCategory(item.categoryId);
      return createScriptGroups([category], {
        rootGroupName: 'General',
      });
    });

    const activeSelectedCount = computed<number>(() => activeItem.value?.scriptIds
      .filter((scriptId) => selectedScriptIds.value.has(scriptId))
      .length ?? 0);

    return {
      outlineItems,
      openCategoryId,
      activeItem,
      activeSelectedCount,
      groups,
      selectedScriptIds,
      revertedStatusByScriptId,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

/* Two panes of glass side by side: the categories, then the open category's settings. */
.explorer {
  display: grid;
  grid-template-columns: minmax(200px, 248px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  height: 100%;
}

.explorer__rail,
.explorer__panel {
  min-width: 0;
  min-height: 0;
}

.explorer__count {
  color: var(--text-tertiary);
  font-size: $font-size-absolute-x-small;
  font-variant-numeric: tabular-nums;

  strong {
    color: var(--text-secondary);
    font-weight: 600;
  }
}

@media screen and (max-width: $media-screen-medium-width) {
  .explorer {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
