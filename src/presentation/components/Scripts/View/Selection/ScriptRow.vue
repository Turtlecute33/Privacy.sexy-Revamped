<template>
  <li
    class="row"
    :class="{ 'is-selected': isSelected }"
  >
    <label class="row__label" :for="checkboxId">
      <SelectionCheckbox
        :input-id="checkboxId"
        :checked="isSelected"
        :accessible-label="`Select ${script.name}`"
        @change="isSelected = $event"
      />
      <MarkdownText
        :text="script.name"
        class="row__title"
      />
    </label>
    <DocumentationTooltip
      v-if="script.docs.length > 0"
      class="row__docs"
      :docs="script.docs"
    />
    <!--
      Shown on every reversible script, selected or not, so the choice between applying and
      reverting is visible up front. Flipping it on an unselected script selects that script
      in the reverted state.
    -->
    <div
      v-if="script.isReversible"
      class="row__revert"
    >
      <RevertToggle :node="revertNode" />
    </div>
  </li>
</template>

<script lang="ts">
import {
  computed, defineComponent, useId, type PropType,
} from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import MarkdownText from '@/presentation/components/Scripts/View/Content/Markdown/MarkdownText.vue';
import DocumentationTooltip from '@/presentation/components/Scripts/View/Content/Documentation/DocumentationTooltip.vue';
import RevertToggle from '@/presentation/components/Scripts/View/Content/RevertToggle.vue';
import { type NodeMetadata, NodeType } from '@/presentation/components/Scripts/View/Content/NodeMetadata';
import SelectionCheckbox from './SelectionCheckbox.vue';
import type { ScriptGroupItem } from './Model/ScriptGroup';

export default defineComponent({
  components: {
    MarkdownText,
    DocumentationTooltip,
    RevertToggle,
    SelectionCheckbox,
  },
  props: {
    script: {
      type: Object as PropType<ScriptGroupItem>,
      required: true,
    },
    isScriptSelected: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    const { modifyCurrentSelection } = injectKey((keys) => keys.useUserSelectionState);

    const isSelected = computed({
      get: () => props.isScriptSelected,
      set: (shouldSelect: boolean) => {
        if (shouldSelect === props.isScriptSelected) {
          return;
        }
        modifyCurrentSelection((selection) => {
          selection.scripts.processChanges({
            changes: [{
              scriptId: props.script.scriptId,
              newStatus: shouldSelect
                ? { isSelected: true, isReverted: false }
                : { isSelected: false },
            }],
          });
        });
      },
    });

    const revertNode = computed<NodeMetadata>(() => ({
      executableId: props.script.scriptId,
      text: props.script.name,
      docs: props.script.docs,
      isReversible: props.script.isReversible,
      children: [],
      type: NodeType.Script,
    }));

    return {
      checkboxId: useId(),
      isSelected,
      revertNode,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 12px;
  border-radius: 8px;
  transition: background-color $motion-duration-fast $motion-ease-standard;

  @include hover-or-touch {
    background: rgba($color-on-primary, 0.05);
  }

  &.is-selected .row__title {
    color: $color-on-primary;
  }

  &__label {
    display: flex;
    /* Shrinks but never grows, so the documentation icon stays beside the title. */
    flex: 0 1 auto;
    align-items: center;
    gap: 12px;
    min-width: 0;
    min-height: 34px;
    @include clickable;
  }

  &__title {
    min-width: 0;
    font-size: $font-size-absolute-small;
    line-height: 1.4;
    color: rgba($color-on-primary, 0.82);
    overflow-wrap: anywhere;
    transition: color $motion-duration-fast $motion-ease-standard;
  }

  &__docs {
    flex: 0 0 auto;
  }

  &__revert {
    flex: 0 0 auto;
    margin-left: auto;
    padding-left: 8px;
  }
}
</style>
