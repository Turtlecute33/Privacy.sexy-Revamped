<template>
  <!--
    A class, not `id="app"`. Vue mounts into the `#app` element in index.html and puts this root
    inside it, so an `id="app"` here shipped the same ID twice, nested: invalid HTML, and enough
    to make an extractor or a `document.querySelector('#app')` pick the wrong node.
  -->
  <div class="app">
    <a class="skip-link" href="#main-content">Skip to privacy controls</a>
    <!--
      The coloured light the glass surfaces refract. Painted by one fixed element of plain radial
      gradients, so it costs nothing per frame and stays put while the panels scroll.
    -->
    <div class="app__backdrop" aria-hidden="true" />
    <div class="app__wrapper">
      <TheHeader />
      <main id="main-content" class="app__main">
        <TheScriptArea />
      </main>
      <TheFooter />
    </div>
    <component
      :is="devToolkitComponent"
      v-if="devToolkitComponent"
    />
  </div>
</template>

<script lang="ts">
import {
  defineAsyncComponent, defineComponent, onMounted, type Component,
} from 'vue';
import TheHeader from '@/presentation/components/TheHeader.vue';
import TheFooter from '@/presentation/components/TheFooter/TheFooter.vue';
import TheScriptArea from '@/presentation/components/Scripts/TheScriptArea.vue';

export default defineComponent({
  components: {
    TheHeader,
    TheScriptArea,
    TheFooter,
  },
  setup() {
    const devToolkitComponent = getOptionalDevToolkitComponent();

    onMounted(() => {
      document.dispatchEvent(new CustomEvent('app-ready'));
    });

    return {
      devToolkitComponent,
    };
  },
});

function getOptionalDevToolkitComponent(): Component | undefined {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isExplicitlyRequested = new URLSearchParams(window.location.search).has('devtools');
  if (!isDevelopment || !isExplicitlyRequested) {
    return undefined;
  }
  return defineAsyncComponent(() => import('@/presentation/components/DevToolkit/DevToolkit.vue'));
}
</script>

<style lang="scss">
@use "@/presentation/assets/styles/main" as *;

/*
 * Emitted here, once, rather than from main.scss, which every component `@use`s and which would
 * therefore duplicate these @font-face blocks and element defaults per component. This style
 * block is global (not scoped), and App.vue is always present, so this is the single place they
 * reach the bundle.
 */
@use "@/presentation/assets/styles/fonts";
@use "@/presentation/assets/styles/theme";
@use "@/presentation/assets/styles/base";

.app {
  position: relative;
  width: 100%;
  min-height: 100dvh;
}

.app__backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(52vw 58vh at 6% -4%, var(--canvas-blob-1), transparent 70%),
    radial-gradient(44vw 52vh at 104% 12%, var(--canvas-blob-2), transparent 70%),
    radial-gradient(56vw 60vh at 72% 108%, var(--canvas-blob-3), transparent 70%),
    radial-gradient(40vw 46vh at 12% 104%, var(--canvas-blob-4), transparent 70%),
    var(--canvas);
}

/*
  Desktop is an app shell: the bar, the workbench and the footer fill the viewport exactly, and
  only the panels inside scroll. The page itself never does, so the categories, the list and the
  generated script are always on screen together. Below the vertical-view breakpoint it falls back
  to a normal scrolling page with the panels stacked.
*/
.app__wrapper {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  /*
    Bounded to the viewport, so no single row can widen the page: the footer's one-line text and
    the pickers in the bar ellipsize or compact inside it instead of pushing the layout sideways.
  */
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  width: min(1760px, 100%);
  height: 100dvh;
  min-height: 620px;
  margin: 0 auto;
  padding: 14px 18px 0;
  color: var(--text);
}

.app__main {
  min-width: 0;
  min-height: 0;
}

/*
  The shell never scrolls the page on desktop, so the scrollbar gutter `base` reserves would only
  leave an empty strip down the right edge and make the side margins uneven. (Chrome paints only
  the root background colour in a gutter, never the backdrop's gradients.)
*/
@media screen and (min-width: $media-vertical-view-breakpoint + 1) and (min-height: 620px) {
  html {
    scrollbar-gutter: auto;
    overflow: hidden;
  }
}

/*
  Below 620px of height the page does scroll, and its scrollbar narrows the space the workbench is
  centred in, which moved it sideways by half a scrollbar on screens wider than the workbench
  (tests/e2e/no-unintended-layout-shifts.cy.ts). The left offset is therefore taken from the full
  viewport width, which a scrollbar does not change, and the width gives way on the right instead.
  Without a scrollbar this is exactly `margin: 0 auto`.
*/
@media screen and (min-width: $media-vertical-view-breakpoint + 1) {
  .app__wrapper {
    --shell-inset: max(0px, (100vw - 1760px) / 2);
    width: min(1760px, 100% - var(--shell-inset));
    margin-left: var(--shell-inset);
    margin-right: 0;
  }
}

.skip-link {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 1000;
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  transform: translateY(-160%);
  transition: transform $motion-duration-standard $motion-ease-out;

  &:focus {
    transform: translateY(0);
  }
}

@media screen and (max-width: $media-vertical-view-breakpoint) {
  .app__wrapper {
    height: auto;
    min-height: 100dvh;
    padding: 10px 12px 0;
    gap: 12px;
  }
}
</style>
