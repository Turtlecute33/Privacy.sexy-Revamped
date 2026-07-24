<template>
  <div class="scripts-menu">
    <div class="control-group">
      <TheOsChanger />
    </div>
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
  display: grid;
  grid-template-columns: minmax(230px, 1fr) minmax(330px, 1.5fr);
  color: rgba($color-on-primary, 0.92);

  .control-group {
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: 64px;
    padding: 10px 16px;
    border-left: 1px solid rgba($color-on-primary, 0.08);

    &:first-child {
      border-left: 0;
    }
  }
}

@media screen and (max-width: 1100px) {
  .scripts-menu {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);

    .control-group {
      min-height: 60px;
      padding: 10px 14px;
    }
  }
}

// Stack the two control groups vertically, swapping the vertical divider for a horizontal one.
@media screen and (max-width: $media-screen-medium-width) {
  .scripts-menu {
    grid-template-columns: 1fr;

    .control-group {
      min-height: 0;
      padding: 10px 14px;
      border-left: 0;

      &:not(:first-child) {
        border-top: 1px solid rgba($color-on-primary, 0.08);
      }
    }
  }
}
</style>
