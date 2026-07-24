<template>
  <div class="slider">
    <div ref="firstElement" class="first">
      <slot name="first" />
    </div>
    <SliderHandle class="handle" @resized="onResize($event)" />
    <div class="second">
      <slot name="second" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, shallowRef } from 'vue';
import { useAnimationFrameLimiter } from '@/presentation/components/Shared/Hooks/Resize/UseAnimationFrameLimiter';
import SliderHandle from './SliderHandle.vue';

export default defineComponent({
  components: {
    SliderHandle,
  },
  props: {
    firstMinWidth: {
      type: String,
      required: true,
    },
    firstInitialWidth: {
      type: String,
      required: true,
    },
    secondMinWidth: {
      type: String,
      required: true,
    },
  },
  setup() {
    const firstElement = shallowRef<HTMLElement>();
    const { resetNextFrame } = useAnimationFrameLimiter();
    let pendingDisplacementX = 0;

    function onResize(displacementX: number): void {
      pendingDisplacementX += displacementX;
      resetNextFrame(() => {
        const element = firstElement.value;
        if (!element) {
          throw new Error('The element reference ref is not correctly assigned to a DOM element.');
        }
        const leftWidth = element.offsetWidth + pendingDisplacementX;
        element.style.width = `${leftWidth}px`;
        pendingDisplacementX = 0;
      });
    }

    return {
      firstElement,
      onResize,
    };
  },
});
</script>

<style lang="scss" scoped>
@use "@/presentation/assets/styles/main" as *;

.slider {
  display: flex;
  flex-direction: row;
  background: rgba($color-on-primary, 0.08);

  .first {
    min-width: v-bind(firstMinWidth);
    width: v-bind(firstInitialWidth);
  }
  .second {
    flex: 1;
    min-width: v-bind(secondMinWidth);
  }
  @media screen and (max-width: $media-vertical-view-breakpoint) {
    flex-direction: column;

    .first {
      width: auto !important;
    }
    .handle {
      display: none;
    }
  }
}
</style>
