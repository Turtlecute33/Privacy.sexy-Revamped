<template>
  <div class="list">
    <div v-if="label" :id="labelId">
      {{ label }}
    </div>
    <!--
      A segmented control. The option buttons stay where they are; a single glass "lens" glides
      under whichever one is pressed, so changing the system or preset reads as one fluid motion
      instead of one highlight switching off and another switching on.
    -->
    <div
      ref="itemsElement"
      class="items"
      role="group"
      :aria-labelledby="label ? labelId : undefined"
    >
      <span
        class="items__lens"
        :class="{ 'items__lens--animated': isLensAnimated }"
        :style="lensStyle"
        aria-hidden="true"
      />
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, computed, shallowRef, ref, onMounted, onUnmounted,
  type CSSProperties,
} from 'vue';

export default defineComponent({
  props: {
    label: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const labelId = computed<string | undefined>(() => (props.label
      ? `menu-option-list-${props.label.toLowerCase().replace(/\s+/g, '-')}`
      : undefined));

    const itemsElement = shallowRef<HTMLElement>();
    const lensStyle = ref<CSSProperties>({ opacity: 0 });
    const isLensAnimated = ref(false);

    /*
      Measured rather than computed from an index, because the options have different widths and
      are nested inside tooltip wrappers. The pressed option is found by its `aria-pressed`, which
      is the same state assistive technology announces, so the lens can never disagree with it.
    */
    function updateLens(): void {
      const container = itemsElement.value;
      if (!container) {
        return;
      }
      const pressed = container.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!pressed) {
        lensStyle.value = { ...lensStyle.value, opacity: 0 };
        return;
      }
      const containerBox = container.getBoundingClientRect();
      const pressedBox = pressed.getBoundingClientRect();
      lensStyle.value = {
        opacity: 1,
        width: `${pressedBox.width}px`,
        height: `${pressedBox.height}px`,
        transform: `translate(${pressedBox.left - containerBox.left}px, ${pressedBox.top - containerBox.top}px)`,
      };
    }

    let mutationObserver: MutationObserver | undefined;
    let resizeObserver: ResizeObserver | undefined;

    onMounted(() => {
      const container = itemsElement.value;
      if (!container) {
        return;
      }
      /*
        Measured in the first frame, not here. `onMounted` runs inside the task that mounts the
        whole app, before the browser has laid out any of it, so reading geometry here forced a
        layout of the entire page into that task: about 30 ms of it with the CPU throttled 4x, and
        the top entry of Lighthouse's "Forced reflow" insight. A frame callback runs right before
        the browser lays the page out anyway, so the same measurement costs nothing extra there,
        and the lens is still in place in the first frame that is painted.
        Placed without motion first, so the lens does not fly in from the corner on load: the
        transition is switched on one frame after the lens has been positioned.
      */
      requestAnimationFrame(() => {
        updateLens();
        requestAnimationFrame(() => {
          isLensAnimated.value = true;
        });
      });
      mutationObserver = new MutationObserver(() => updateLens());
      mutationObserver.observe(container, {
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-pressed'],
      });
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => updateLens());
        resizeObserver.observe(container);
      }
    });

    onUnmounted(() => {
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
    });

    return {
      labelId,
      itemsElement,
      lensStyle,
      isLensAnimated,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.list {
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 10px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: $font-size-absolute-small;
  line-height: 1.2;

  > :first-child:not(.items) {
    flex: 0 0 auto;
    color: var(--text-tertiary);
    font-size: $font-size-absolute-x-small;
    font-weight: 500;
  }
}

.items {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--fill-track);

  :deep(.flat-button) {
    position: relative;
    z-index: 1;
    min-height: 32px;
    padding: 6px 14px;
    border-radius: 999px;
    color: var(--text-secondary);
    font-weight: 500;
    transform: none;

    &.is-pressed {
      border-color: transparent;
      background: transparent;
      color: var(--text);
    }

    &:not(.disabled):not(.is-pressed):hover {
      border-color: transparent;
      background: transparent;
      color: var(--text);
    }
  }
}

.items__lens {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  border-radius: 999px;
  background: var(--lens);
  box-shadow: var(--lens-shadow);
  pointer-events: none;

  &--animated {
    transition:
      transform 260ms $motion-ease-out,
      width 260ms $motion-ease-out,
      opacity $motion-duration-standard $motion-ease-standard;
  }
}

@media screen and (max-width: 1180px) {
  .items :deep(.flat-button) {
    padding: 6px 11px;
  }
}

@media (pointer: coarse) {
  .items :deep(.flat-button) {
    min-height: 40px;
  }
}
</style>
