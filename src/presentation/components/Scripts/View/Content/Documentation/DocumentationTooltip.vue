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
    <template #tooltip>
      <div
        :id="tooltipId"
        role="tooltip"
      >
        <DocumentationText :docs="docs" />
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
  color: $color-primary;

  &__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 30px;
    min-height: 30px;
    padding: 4px;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1;
    cursor: help;
    transition:
      color 180ms ease-out,
      background-color 180ms ease-out,
      border-color 180ms ease-out;

    @include hover-or-touch {
      border-color: rgba($color-on-primary, 0.12);
      background: rgba($color-on-primary, 0.07);
      color: $color-secondary;
    }

    &:focus-visible {
      color: $color-secondary;
      outline: 3px solid $color-secondary;
      outline-offset: 2px;
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
