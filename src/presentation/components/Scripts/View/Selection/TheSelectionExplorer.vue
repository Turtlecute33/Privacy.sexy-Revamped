<template>
  <div class="explorer">
    <CategoryRail
      class="explorer__rail"
      :items="outlineItems"
      :selected-script-ids="selectedScriptIds"
      :active-category-id="activeItem?.categoryId"
      @category-activated="activeCategoryId = $event"
    />
    <!--
      Remounting per category resets the list scroll position, so opening a category
      always starts from its first group.
    -->
    <ScriptListPanel
      v-if="activeItem"
      :key="activeItem.categoryId"
      class="explorer__panel"
      :groups="groups"
      :selected-script-ids="selectedScriptIds"
      :reverted-status-by-script-id="revertedStatusByScriptId"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
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
  setup() {
    const { currentState } = injectKey((keys) => keys.useCollectionState);
    const { selectedScriptIds, revertedStatusByScriptId } = useSelectedScriptIds(
      injectKey((keys) => keys.useUserSelectionState),
    );

    const outlineItems = computed<ReadonlyArray<CategoryOutlineItem>>(
      () => createCategoryOutline(currentState.value.collection),
    );

    const activeCategoryId = ref<ExecutableId | undefined>();

    /*
      Falling back to the first category covers both the initial render and switching to
      an operating system whose collection does not have the previously opened category.
    */
    const activeItem = computed<CategoryOutlineItem | undefined>(
      () => outlineItems.value.find((item) => item.categoryId === activeCategoryId.value)
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

    return {
      outlineItems,
      activeCategoryId,
      activeItem,
      groups,
      selectedScriptIds,
      revertedStatusByScriptId,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.explorer {
  display: grid;
  grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
  min-height: 0;
  height: 100%;
  background: $color-scripts-bg;
}

.explorer__rail,
.explorer__panel {
  min-width: 0;
  min-height: 0;
}

@media screen and (max-width: $media-screen-medium-width) {
  .explorer {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
}
</style>
