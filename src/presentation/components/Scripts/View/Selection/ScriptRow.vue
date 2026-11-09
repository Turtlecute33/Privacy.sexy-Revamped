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
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 46px;
  padding: 4px 12px 4px 14px;
  transition: background-color $motion-duration-fast $motion-ease-standard;

  /* Hairline separators inset past the checkbox, so they divide titles rather than the whole card. */
  & + &::before {
    position: absolute;
    top: 0;
    right: 0;
    left: 46px;
    height: 1px;
    background: var(--hairline);
    content: '';
  }

  @include hover-or-touch {
    background: var(--fill-hover);
  }

  &.is-selected {
    background: var(--fill-selected);

    .row__title {
      color: var(--text);
    }
  }

  &__label {
    display: flex;
    /* Shrinks but never grows, so the documentation icon stays beside the title. */
    flex: 0 1 auto;
    align-items: center;
    gap: 14px;
    min-width: 0;
    min-height: 38px;
    @include clickable;
  }

  &__title {
    min-width: 0;
    color: var(--text-secondary);
    font-size: $font-size-absolute-normal;
    line-height: 1.4;
    overflow-wrap: anywhere;
    transition: color $motion-duration-fast $motion-ease-standard;
  }

  &__docs {
    flex: 0 0 auto;
  }

  /*
    Every reversible script shows its apply/revert switch, but quietly until the row is in play
    (hovered, focused or selected), so a long list reads as titles first and controls second.
  */
  &__revert {
    flex: 0 0 auto;
    margin-left: auto;
    padding-left: 8px;
    opacity: 0.55;
    transition: opacity $motion-duration-fast $motion-ease-standard;
  }

  &:hover &__revert,
  &:focus-within &__revert,
  &.is-selected &__revert {
    opacity: 1;
  }
}

@media (hover: none) {
  .row__revert {
    opacity: 1;
  }
}
</style>
