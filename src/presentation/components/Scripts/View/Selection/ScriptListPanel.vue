<template>
  <div class="panel">
    <header
      v-if="heading || $slots.actions"
      class="panel__header"
    >
      <h3
        v-if="heading"
        class="panel__title"
      >
        {{ heading }}
      </h3>
      <div class="panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <!--
      `aria-busy` while rows are still being added, so assistive technologies can tell that the list
      is not complete yet.
    -->
    <div
      class="panel__body"
      :aria-busy="!isFullyRendered"
    >
      <ScriptGroupSection
        v-for="{ group, renderedScriptCount } of renderedGroups"
        :key="group.categoryId"
        :group="group"
        :rendered-script-count="renderedScriptCount"
        :selected-script-ids="selectedScriptIds"
        :reverted-status-by-script-id="revertedStatusByScriptId"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import ScriptGroupSection from './ScriptGroupSection.vue';
import { useGradualRendering } from './UseGradualRendering';
import type { ScriptGroup } from './Model/ScriptGroup';

interface RenderedGroup {
  readonly group: ScriptGroup;
  readonly renderedScriptCount: number;
}

export default defineComponent({
  components: {
    ScriptGroupSection,
  },
  props: {
    /**
     * Optional, because a category list is already labelled by the active category in the
     * rail; only context the list cannot show otherwise, such as a search query, needs it.
     */
    heading: {
      type: String,
      default: undefined,
    },
    groups: {
      type: Array as PropType<ReadonlyArray<ScriptGroup>>,
      required: true,
    },
    selectedScriptIds: {
      type: Object as PropType<ReadonlySet<ExecutableId>>,
      required: true,
    },
    revertedStatusByScriptId: {
      type: Object as PropType<ReadonlyMap<ExecutableId, boolean>>,
      required: true,
    },
  },
  setup(props) {
    const totalScriptCount = computed<number>(() => props.groups.reduce(
      (sum, group) => sum + group.scripts.length,
      0,
    ));

    /*
      Rows are the unit, not groups: a single category holds up to a few hundred scripts, and a
      broad search puts most of the collection into a handful of groups.
    */
    const { renderedCount, isComplete } = useGradualRendering(
      () => totalScriptCount.value,
      () => props.groups,
    );

    /*
      Groups are filled in order, and a group appears only once its first row is due. Each group
      still receives the full `ScriptGroup`, so its header counts and its "select all" checkbox
      cover every script in it, rendered yet or not.
    */
    const renderedGroups = computed<ReadonlyArray<RenderedGroup>>(() => {
      const result = new Array<RenderedGroup>();
      let remaining = renderedCount.value;
      for (let i = 0; i < props.groups.length && remaining > 0; i++) {
        const group = props.groups[i];
        const renderedScriptCount = Math.min(remaining, group.scripts.length);
        result.push({ group, renderedScriptCount });
        remaining -= renderedScriptCount;
      }
      return result;
    });

    return {
      renderedGroups,
      isFullyRendered: isComplete,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.panel__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba($color-on-primary, 0.08);
}

.panel__title {
  min-width: 0;
  margin: 0;
  font-size: $font-size-absolute-normal;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: $color-on-primary;
  overflow-wrap: anywhere;
}

.panel__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: auto;
  color: rgba($color-on-primary, 0.72);
}

.panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 16px 20px;
}

@media screen and (max-width: $media-screen-medium-width) {
  .panel__header {
    padding: 10px 12px;
  }

  .panel__body {
    padding: 4px 12px 16px;
  }
}
</style>
