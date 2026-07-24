<template>
  <transition name="card-expand-collapse-transition">
    <slot />
  </transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  // Empty component for ESLint compatibility, workaround for https://github.com/vuejs/vue-eslint-parser/issues/125.
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

/*
  Enter-only fade. Intentionally no `leave` transition: when switching directly
  from one card to another, a leave transition would keep the previous card's
  expander mounted while the next one opens, briefly stacking both and causing a
  glitchy double-height jump. Collapsing instantly keeps card switching clean.
*/
.card-expand-collapse-transition-enter-active {
  transition:
    opacity $motion-duration-fast $motion-ease-standard,
    transform $motion-duration-standard $motion-ease-out;
}

.card-expand-collapse-transition-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
