<template>
  <div class="container">
    <div class="header">
      <div class="content">
        <slot />
      </div>
      <DocumentationTooltip
        v-if="docs && docs.length > 0"
        class="info-action"
        :docs="docs"
      />
      <div
        v-if="$slots.action"
        class="row-action"
      >
        <slot name="action" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DocumentationTooltip from './DocumentationTooltip.vue';

export default defineComponent({
  components: {
    DocumentationTooltip,
  },
  props: {
    docs: {
      type: Array as PropType<readonly string[]>,
      required: true,
    },
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.container {
  display: flex;
  flex-direction: column;
  flex: 1; // Expands the container to fill available horizontal space, enabling alignment of child items.
  max-width: 100%; // Prevents horizontal expansion of inner content (e.g., when a code block is shown)

  .header {
    display: flex;
    align-items: center;
    flex-direction: row;
    gap: 6px;
    min-height: 36px;

    .content {
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
    }

    .info-action {
      flex: 0 0 auto;
    }

    .row-action {
      display: flex;
      flex: 0 0 84px;
      justify-content: flex-end;
      margin-left: auto;
    }
  }
}
</style>
