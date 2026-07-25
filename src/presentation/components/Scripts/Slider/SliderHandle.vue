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

$color          : rgba($color-on-primary, 0.3);
$color-hover    : $color-secondary;
$cursor         : v-bind(cursorCssValue);

.handle {
  position: relative;
  cursor: $cursor;

  @include reset-button;

  display: flex;
  flex-direction: column;
  align-items: center;

  width: 20px;
  margin: 0;
  padding: 0 7px;
  background: $color-primary-darkest;

  @include clickable($cursor: $cursor);

  &::before {
    position: absolute;
    inset: 0 -12px;
    content: "";
  }

  @include hover-or-touch {
    .line {
      background: $color-hover;
    }
    .icon {
      color: $color-hover;
    }
  }

  .line {
    position: relative;
    flex: 1;
    background: $color;
    width: 1px;
  }
  .icon {
    position: relative;
    color: $color;
    font-size: $font-size-absolute-x-small;
  }
}
</style>
