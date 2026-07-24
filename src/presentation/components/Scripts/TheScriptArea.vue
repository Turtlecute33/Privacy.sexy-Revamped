<template>
  <div class="script-area">
    <div class="workbench">
      <header class="workbench__header">
        <h2 class="visually-hidden">
          Privacy script builder
        </h2>
        <TheSearchBar class="workbench__search" />
      </header>
      <TheScriptsMenu
        class="workbench__toolbar"
      />
      <HorizontalResizeSlider
        class="horizontal-slider"
        first-initial-width="68%"
        first-min-width="40%"
        second-min-width="26%"
      >
        <template #first>
          <section class="workbench__pane" aria-label="Privacy tweaks">
            <TheScriptsView :current-view="ViewType.Cards" />
          </section>
        </template>
        <template #second>
          <section class="workbench__pane" aria-label="Generated script">
            <TheCodeArea />
          </section>
        </template>
      </HorizontalResizeSlider>
      <TheCodeButtons class="workbench__actions" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TheCodeArea from '@/presentation/components/Code/TheCodeArea.vue';
import TheCodeButtons from '@/presentation/components/Code/CodeButtons/TheCodeButtons.vue';
import TheScriptsView from '@/presentation/components/Scripts/View/TheScriptsView.vue';
import TheScriptsMenu from '@/presentation/components/Scripts/Menu/TheScriptsMenu.vue';
import TheSearchBar from '@/presentation/components/TheSearchBar.vue';
import HorizontalResizeSlider from '@/presentation/components/Scripts/Slider/HorizontalResizeSlider.vue';
import { ViewType } from '@/presentation/components/Scripts/Menu/View/ViewType';

export default defineComponent({
  components: {
    TheCodeArea,
    TheCodeButtons,
    TheScriptsView,
    TheScriptsMenu,
    TheSearchBar,
    HorizontalResizeSlider,
  },
  setup: () => ({ ViewType }),
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.script-area {
  display: flex;
  flex-direction: column;
}

.workbench {
  overflow: hidden;
  border: 1px solid rgba($color-on-primary, 0.08);
  border-radius: 18px;
  background: $color-primary-darkest;
  box-shadow: 0 18px 46px rgba($color-primary-darkest, 0.14);
}

.workbench__header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba($color-on-primary, 0.1);
  color: $color-on-primary;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.workbench__search {
  :deep(.search) {
    border-color: rgba($color-on-primary, 0.14);
    box-shadow: none;
  }
}

.workbench__toolbar {
  border-bottom: 1px solid rgba($color-on-primary, 0.1);
  background: rgba($color-on-primary, 0.035);
}

.workbench__pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  background: $color-scripts-bg;
}

.horizontal-slider {
  min-height: clamp(680px, calc(100dvh - 280px), 920px);
}

.workbench__actions {
  min-height: 64px;
  padding: 10px 20px;
  border-top: 1px solid rgba($color-on-primary, 0.1);
  background: rgba($color-on-primary, 0.035);
}

@media screen and (max-width: $media-vertical-view-breakpoint) {
  .horizontal-slider {
    min-height: 0;
    row-gap: 1px;
  }
}

@media screen and (max-width: $media-screen-medium-width) {
  .workbench {
    border-radius: 14px;
  }

  .workbench__header {
    padding: 10px 12px;
  }
}
</style>
