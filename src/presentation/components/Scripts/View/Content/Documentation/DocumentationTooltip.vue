<template>
  <TooltipWrapper class="documentation-tooltip">
    <span
      class="documentation-tooltip__trigger"
      role="img"
      tabindex="0"
      aria-label="Setting information"
      :aria-describedby="tooltipId"
    >
      <AppIcon
        icon="circle-info"
        aria-hidden="true"
      />
    </span>
    <!--
      The documentation prose is rendered only after the first hover. The scripts view mounts one of
      these per script, and their combined hidden bodies made up the majority of the document that
      gates first paint. The labelled container itself stays mounted so the trigger's
      `aria-describedby` never points at a missing element.
    -->
    <template #tooltip="{ hasBeenShown }">
      <div
        :id="tooltipId"
        role="tooltip"
      >
        <DocumentationText
          v-if="hasBeenShown"
          :docs="docs"
        />
      </div>
    </template>
  </TooltipWrapper>
</template>

<script lang="ts">
import {
  defineComponent, type PropType, useId,
} from 'vue';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';
import TooltipWrapper from '@/presentation/components/Shared/Tooltip/TooltipWrapper.vue';
import DocumentationText from './DocumentationText.vue';

export default defineComponent({
  components: {
    AppIcon,
    DocumentationText,
    TooltipWrapper,
  },
  props: {
    docs: {
      type: Array as PropType<readonly string[]>,
      required: true,
    },
  },
  setup() {
    return {
      tooltipId: useId(),
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.documentation-tooltip {
  color: var(--text-tertiary);

  &__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 28px;
    min-height: 28px;
    padding: 4px;
    border-radius: 999px;
    font-size: 13px;
    line-height: 1;
    cursor: help;
    opacity: 0.8;
    transition:
      color $motion-duration-fast $motion-ease-standard,
      background-color $motion-duration-fast $motion-ease-standard,
      opacity $motion-duration-fast $motion-ease-standard;

    @include hover-or-touch {
      background: var(--fill-hover);
      color: var(--accent-text);
      opacity: 1;
    }

    &:focus-visible {
      color: var(--accent-text);
      opacity: 1;
      outline: 2px solid var(--focus-ring);
      outline-offset: 1px;
    }
  }
}

@media (pointer: coarse) {
  .documentation-tooltip {
    &__trigger {
      min-width: 40px;
      min-height: 40px;
    }
  }
}
</style>
