<template>
  <div class="scripts-menu">
    <div class="control-group">
      <TheOsChanger />
    </div>
    <span class="scripts-menu__divider" aria-hidden="true" />
    <div class="control-group">
      <TheRecommendationSelector />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TheOsChanger from './TheOsChanger.vue';
import TheRecommendationSelector from './Recommendation/TheRecommendationSelector.vue';

export default defineComponent({
  components: {
    TheRecommendationSelector,
    TheOsChanger,
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.scripts-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-width: 0;

  .control-group {
    display: flex;
    align-items: center;
    min-width: 0;
  }
}

.scripts-menu__divider {
  width: 1px;
  height: 22px;
  background: var(--hairline);
}

/* The pickers explain themselves once space is short; their labels stay for screen readers. */
@media screen and (max-width: 1360px) {
  .scripts-menu {
    gap: 12px;

    :deep(.list > :first-child:not(.items)) {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  }
}

@media screen and (max-width: $media-vertical-view-breakpoint) {
  .scripts-menu {
    justify-content: flex-start;
    flex-wrap: wrap;
    overflow-x: auto;
  }

  .scripts-menu__divider {
    display: none;
  }
}
</style>
