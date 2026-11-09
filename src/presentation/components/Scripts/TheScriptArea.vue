<template>
  <div class="script-area">
    <h2 class="visually-hidden">
      Privacy script builder
    </h2>
    <!--
      The script list opens as wide as the slider allows, leaving the generated script a
      comfortable reading column. Browsing and selecting is the primary task; the preview is
      there to confirm the result and can be dragged wider when the user wants to read it.
    -->
    <HorizontalResizeSlider
      class="horizontal-slider"
      first-initial-width="66%"
      first-min-width="48%"
      second-min-width="24%"
    >
      <template #first>
        <section class="workbench__pane workbench__pane--scripts" aria-label="Privacy tweaks">
          <TheScriptsView />
        </section>
      </template>
      <template #second>
        <section class="workbench__pane workbench__pane--code" aria-label="Generated script">
          <header class="code-panel__header">
            <div class="code-panel__title">
              <span class="code-panel__file">{{ filename }}</span>
              <span class="code-panel__meta">
                {{ selectedCountLabel }}
              </span>
            </div>
            <TheCodeButtons class="code-panel__actions" />
          </header>
          <TheCodeArea class="workbench__code-area" />
        </section>
      </template>
    </HorizontalResizeSlider>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import { ScriptFilename } from '@/application/CodeRunner/ScriptFilename';
import TheCodeArea from '@/presentation/components/Code/TheCodeArea.vue';
import TheCodeButtons from '@/presentation/components/Code/CodeButtons/TheCodeButtons.vue';
import TheScriptsView from '@/presentation/components/Scripts/View/TheScriptsView.vue';
import HorizontalResizeSlider from '@/presentation/components/Scripts/Slider/HorizontalResizeSlider.vue';

export default defineComponent({
  components: {
    TheCodeArea,
    TheCodeButtons,
    TheScriptsView,
    HorizontalResizeSlider,
  },
  setup() {
    const { currentState } = injectKey((keys) => keys.useCollectionState);
    const { currentSelection } = injectKey((keys) => keys.useUserSelectionState);

    const filename = computed<string>(() => {
      const { fileExtension } = currentState.value.collection.scriptMetadata;
      return fileExtension ? `${ScriptFilename}.${fileExtension}` : ScriptFilename;
    });

    const selectedCountLabel = computed<string>(() => {
      const count = currentSelection.value.scripts.selectedScripts.length;
      if (count === 0) {
        return 'Nothing selected yet';
      }
      return `${count} ${count === 1 ? 'tweak' : 'tweaks'} selected`;
    });

    return {
      filename,
      selectedCountLabel,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.script-area {
  height: 100%;
  min-height: 0;
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

.horizontal-slider {
  height: 100%;
}

.workbench__pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.workbench__pane--code {
  @include glass-surface($radius: 22px);
}

.code-panel__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding: 14px 14px 12px 20px;
  border-bottom: 1px solid var(--hairline);
}

.code-panel__title {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.code-panel__file {
  overflow: hidden;
  color: var(--text);
  font-family: $font-family-monospace;
  font-size: $font-size-absolute-small;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-panel__meta {
  color: var(--text-tertiary);
  font-size: $font-size-absolute-x-small;
  font-variant-numeric: tabular-nums;
}

.code-panel__actions {
  flex: 0 0 auto;
}

/*
  The editor fills what the pane header leaves over. Without an explicit `flex`, its own
  `height: 100%` would resolve against the whole pane and overflow by the header's height.
*/
.workbench__code-area {
  flex: 1;
  min-height: 0;
  /* Keeps full-width line highlights inside the panel's rounded bottom corners. */
  overflow: hidden;
  border-radius: 0 0 22px 22px;
}

// Stacked layout: each pane gets its own height instead of sharing one row.
@media screen and (max-width: $media-vertical-view-breakpoint) {
  .horizontal-slider {
    height: auto;
    row-gap: 12px;
  }

  .workbench__pane--scripts {
    height: clamp(520px, 78dvh, 820px);
  }
}
</style>
