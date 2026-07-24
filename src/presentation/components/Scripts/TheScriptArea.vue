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
      <!--
        The script list opens as wide as the slider allows, leaving the generated script at
        its minimum width. Browsing and selecting is the primary task; the preview is there
        to confirm the result and can be dragged wider when the user wants to read it.
      -->
      <HorizontalResizeSlider
        class="horizontal-slider"
        first-initial-width="74%"
        first-min-width="40%"
        second-min-width="26%"
      >
        <template #first>
          <section class="workbench__pane workbench__pane--scripts" aria-label="Privacy tweaks">
            <TheScriptsView />
          </section>
        </template>
        <template #second>
          <section class="workbench__pane workbench__pane--code" aria-label="Generated script">
            <TheCodeArea class="workbench__code-area" />
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

export default defineComponent({
  components: {
    TheCodeArea,
    TheCodeButtons,
    TheScriptsView,
    TheScriptsMenu,
    TheSearchBar,
    HorizontalResizeSlider,
  },
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

/*
  The editor fills what the pane header leaves over. Without an explicit `flex`, its own
  `height: 100%` would resolve against the whole pane and overflow by the header's height.
*/
.workbench__code-area {
  flex: 1;
  min-height: 0;
}

/*
  A definite height, rather than a minimum, is what lets the script list scroll inside its
  own pane. Without it the pane grows to the full length of a category and the page itself
  becomes the scroll container, which strands the generated script far below the fold.
*/
.horizontal-slider {
  height: clamp(680px, calc(100dvh - 280px), 920px);
}

.workbench__actions {
  min-height: 64px;
  padding: 10px 20px;
  border-top: 1px solid rgba($color-on-primary, 0.1);
  background: rgba($color-on-primary, 0.035);
}

// Stacked layout: each pane gets its own height instead of sharing one row.
@media screen and (max-width: $media-vertical-view-breakpoint) {
  .horizontal-slider {
    height: auto;
    row-gap: 1px;
  }

  .workbench__pane--scripts {
    height: clamp(440px, 70dvh, 760px);
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
