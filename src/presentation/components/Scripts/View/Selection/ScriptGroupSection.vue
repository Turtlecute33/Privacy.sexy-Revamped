<template>
  <section class="group">
    <header class="group__header">
      <label class="group__heading" :for="checkboxId">
        <SelectionCheckbox
          :input-id="checkboxId"
          :checked="areAllSelected"
          :indeterminate="isAnySelected"
          :accessible-label="`Select every script in ${group.name}`"
          @change="setSelectionForWholeGroup($event)"
        />
        <span class="group__name">{{ group.name }}</span>
      </label>
      <DocumentationTooltip
        v-if="group.docs.length > 0"
        class="group__docs"
        :docs="group.docs"
      />
      <span class="group__count">
        {{ selectedCount }}<span class="group__count__separator">/</span>{{ group.scripts.length }}
      </span>
      <!--
        Mirrors the per-script switch at group level, the way the old tree offered one on
        every category whose scripts could all be reverted. Flipping it selects the whole
        group in that direction.
      -->
      <div
        v-if="isWhollyReversible"
        class="group__revert"
      >
        <ToggleSwitch
          v-model="isGroupReverted"
          label="Revert"
          off-label="Apply"
        />
      </div>
    </header>
    <ul class="group__scripts">
      <ScriptRow
        v-for="script of group.scripts"
        :key="script.scriptId"
        :script="script"
        :is-script-selected="selectedScriptIds.has(script.scriptId)"
      />
    </ul>
  </section>
</template>

<script lang="ts">
import {
  computed, defineComponent, useId, type PropType,
} from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import DocumentationTooltip from '@/presentation/components/Scripts/View/Content/Documentation/DocumentationTooltip.vue';
import ToggleSwitch from '@/presentation/components/Scripts/View/Content/ToggleSwitch.vue';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import type { ScriptSelectionChange } from '@/application/Context/State/Selection/Script/ScriptSelectionChange';
import SelectionCheckbox from './SelectionCheckbox.vue';
import ScriptRow from './ScriptRow.vue';
import type { ScriptGroup } from './Model/ScriptGroup';

export default defineComponent({
  components: {
    SelectionCheckbox,
    DocumentationTooltip,
    ScriptRow,
    ToggleSwitch,
  },
  props: {
    group: {
      type: Object as PropType<ScriptGroup>,
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
    const { modifyCurrentSelection } = injectKey((keys) => keys.useUserSelectionState);

    const selectedCount = computed<number>(() => props.group.scripts.filter(
      (script) => props.selectedScriptIds.has(script.scriptId),
    ).length);

    const areAllSelected = computed<boolean>(
      () => selectedCount.value === props.group.scripts.length,
    );

    const isAnySelected = computed<boolean>(() => selectedCount.value > 0);

    const isWhollyReversible = computed<boolean>(
      () => props.group.scripts.every((script) => script.isReversible),
    );

    const isGroupReverted = computed<boolean>({
      get: () => areAllSelected.value && props.group.scripts.every(
        (script) => props.revertedStatusByScriptId.get(script.scriptId) === true,
      ),
      set: (shouldRevert: boolean) => {
        const changes = props.group.scripts
          .map((script): ScriptSelectionChange => ({
            scriptId: script.scriptId,
            newStatus: { isSelected: true, isReverted: shouldRevert },
          }));
        modifyCurrentSelection((selection) => {
          selection.scripts.processChanges({ changes });
        });
      },
    });

    /**
     * Only the scripts the group actually lists are affected. Nested categories are
     * rendered as their own groups, so they keep their own header in charge of them.
     */
    function setSelectionForWholeGroup(shouldSelect: boolean): void {
      const changes = props.group.scripts
        .filter((script) => props.selectedScriptIds.has(script.scriptId) !== shouldSelect)
        .map((script): ScriptSelectionChange => ({
          scriptId: script.scriptId,
          newStatus: shouldSelect
            ? { isSelected: true, isReverted: false }
            : { isSelected: false },
        }));
      if (changes.length === 0) {
        return;
      }
      modifyCurrentSelection((selection) => {
        selection.scripts.processChanges({ changes });
      });
    }

    return {
      checkboxId: useId(),
      isWhollyReversible,
      isGroupReverted,
      selectedCount,
      areAllSelected,
      isAnySelected,
      setSelectionForWholeGroup,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.group {
  & + & {
    margin-top: 20px;
  }

  /* Scrolls away with its rows; nothing in the list stays pinned. */
  &__header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
  }

  &__heading {
    display: flex;
    /* Shrinks but never grows, so the documentation icon stays beside the name. */
    flex: 0 1 auto;
    align-items: center;
    gap: 12px;
    min-width: 0;
    min-height: 32px;
    @include clickable;
  }

  &__name {
    min-width: 0;
    font-size: $font-size-absolute-small;
    font-weight: 650;
    line-height: 1.3;
    color: $color-on-primary;
    overflow-wrap: anywhere;
  }

  &__docs {
    flex: 0 0 auto;
  }

  &__count {
    flex: 0 0 auto;
    margin-left: auto;
    padding-left: 8px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: rgba($color-on-primary, 0.5);

    &__separator {
      padding: 0 1px;
      opacity: 0.5;
    }
  }

  &__revert {
    flex: 0 0 auto;
    padding-left: 4px;
  }

  &__scripts {
    @include reset-ul;
    border: 1px solid rgba($color-on-primary, 0.07);
    border-radius: 12px;
    background: rgba($color-on-primary, 0.03);
    padding: 4px;
  }
}
</style>
