<template>
  <button
    ref="handleElementRef"
    class="handle"
    type="button"
    aria-label="Resize panels"
    @keydown="onKeydown"
  >
    <div class="line" />
    <AppIcon
      class="icon"
      icon="left-right"
    />
    <div class="line" />
  </button>
</template>

<script lang="ts">
import { defineComponent, shallowRef, watch } from 'vue';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';
import { useDragHandler } from './UseDragHandler';
import { useGlobalCursor } from './UseGlobalCursor';

export default defineComponent({
  components: {
    AppIcon,
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    resized: (displacementX: number) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(_, { emit }) {
    const cursorCssValue = 'ew-resize';

    const handleElementRef = shallowRef<HTMLElement | undefined>();

    const { displacementX, isDragging } = useDragHandler(handleElementRef);

    useGlobalCursor(isDragging, cursorCssValue);

    watch(displacementX, (value) => {
      emit('resized', value);
    });

    const keyboardStepPx = 32;

    function onKeydown(event: KeyboardEvent) {
      const step = {
        ArrowLeft: -keyboardStepPx,
        ArrowRight: keyboardStepPx,
      }[event.key];
      if (step === undefined) {
        return;
      }
      event.preventDefault();
      emit('resized', step);
    }

    return {
      handleElementRef,
      isDragging,
      cursorCssValue,
      onKeydown,
    };
  },
});
</script>

<style lang="scss" scoped>
@use "@/presentation/assets/styles/main" as *;

$cursor         : v-bind(cursorCssValue);

/*
  The handle is the gap between two panes of glass. At rest it is invisible; a slim grip pill
  appears under the pointer or keyboard focus, so the seam is discoverable without drawing a line
  through the layout.
*/
.handle {
  position: relative;
  cursor: $cursor;

  @include reset-button;

  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  width: 14px;
  margin: 0;
  padding: 0;
  background: transparent;

  @include clickable($cursor: $cursor);

  &::before {
    position: absolute;
    inset: 0 -4px;
    content: "";
  }

  &::after {
    width: 4px;
    height: 44px;
    border-radius: 999px;
    background: var(--text-tertiary);
    content: "";
    opacity: 0;
    transition:
      opacity $motion-duration-standard $motion-ease-standard,
      height $motion-duration-emphasized $motion-ease-out,
      background-color $motion-duration-fast $motion-ease-standard;
  }

  @include hover-or-touch {
    &::after {
      height: 64px;
      opacity: 0.45;
    }
  }

  &:active::after {
    background: var(--accent);
    opacity: 0.9;
  }

  &:focus-visible {
    outline: 0;

    &::after {
      height: 64px;
      background: var(--accent);
      opacity: 0.9;
    }
  }

  .line,
  .icon {
    display: none;
  }
}
</style>
