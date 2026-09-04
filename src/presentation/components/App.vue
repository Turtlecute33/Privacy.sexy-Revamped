<template>
  <!--
    A class, not `id="app"`. Vue mounts into the `#app` element in index.html and puts this root
    inside it, so an `id="app"` here shipped the same ID twice, nested: invalid HTML, and enough
    to make an extractor or a `document.querySelector('#app')` pick the wrong node.
  -->
  <div class="app">
    <a class="skip-link" href="#main-content">Skip to privacy controls</a>
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
@use "@/presentation/assets/styles/base";

.app {
  width: 100%;
  min-height: 100dvh;

  .app__wrapper {
    display: flex;
    flex-direction: column;
    background-color: $color-surface;
    color: $color-on-surface;
    min-height: 100dvh;
  }

  .app__main {
    width: min(1440px, calc(100% - 32px));
    margin: 0 auto;
    padding: 8px 0 32px;
  }
}

.skip-link {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 1000;
  padding: 12px 16px;
  border-radius: 10px;
  background: $color-primary-darkest;
  color: $color-on-primary;
  transform: translateY(-150%);
  transition: transform $motion-duration-standard $motion-ease-out;

  &:focus {
    transform: translateY(0);
  }
}

@media screen and (max-width: $media-screen-medium-width) {
  .app {
    .app__main {
      width: min(100% - 32px, 1440px);
      padding-top: 4px;
    }

  }
}

@media screen and (max-width: $media-screen-small-width) {
  .app {
    .app__main {
      width: min(100% - 20px, 1440px);
    }
  }
}
</style>
