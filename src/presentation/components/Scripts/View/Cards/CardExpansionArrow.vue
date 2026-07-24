<template>
  <div class="arrow-container">
    <div class="arrow" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  // Empty component for ESLint compatibility, workaround for https://github.com/vuejs/vue-eslint-parser/issues/125.
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

$arrow-size: $font-size-absolute-normal;

.arrow-container {
  position: relative;
  .arrow {
    position: absolute;
    left: 50%;
    top: calc(-0.35 * $arrow-size);
    border: solid rgba($color-on-primary, 0.4);
    border-width: 0 $arrow-size $arrow-size 0;
    padding: $arrow-size;
    transform: translateX(-50%) rotate(-135deg);
  }
}
</style>
