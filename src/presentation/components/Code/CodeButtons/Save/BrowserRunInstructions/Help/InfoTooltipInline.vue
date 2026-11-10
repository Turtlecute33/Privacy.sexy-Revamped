<template>
  <span
    class="info-container"
  >
    <TooltipWrapper>
      <AppIcon icon="circle-info" />
      <template #tooltip>
        <slot />
      </template>
    </TooltipWrapper>
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TooltipWrapper from '@/presentation/components/Shared/Tooltip/TooltipWrapper.vue';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';

export default defineComponent({
  components: {
    TooltipWrapper,
    AppIcon,
  },
  props: {
    hasLeftMargin: {
      type: Boolean,
      default: false,
    },
  },
});
</script>

<style lang="scss">
/* Quiet until pointed at, like the documentation buttons in the script list. */
.info-container {
  vertical-align: text-top;
  color: var(--text-tertiary);
  transition: color 120ms ease;

  &:hover,
  &:focus-within {
    color: var(--accent-text);
  }
}
</style>
