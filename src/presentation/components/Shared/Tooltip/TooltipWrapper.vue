<template>
  <div class="tooltip">
    <!--
      Both trigger and tooltip elements are grouped within a single parent for accurate positioning.
      It allows the tooltip content to calculate its position based on the trigger's location.
    -->
    <div
      ref="triggeringElement"
      class="tooltip__trigger"
      @mouseenter="showTooltip"
      @mouseleave="scheduleTooltipHide"
      @focusin="showTooltip"
      @focusout="scheduleTooltipHide"
    >
      <slot />
    </div>
    <div
      class="tooltip__overlay"
      :class="{ 'tooltip__overlay--visible': isTooltipVisible }"
      :aria-hidden="!isTooltipVisible"
    >
      <div
        ref="tooltipDisplayElement"
        class="tooltip__display"
        :style="displayStyles"
        @mouseenter="showTooltip"
        @mouseleave="hideTooltip"
        @focusin="showTooltip"
        @focusout="scheduleTooltipHide"
      >
        <div class="tooltip__content">
          <slot name="tooltip" />
        </div>
        <div
          ref="arrowElement"
          class="tooltip__arrow"
          :style="arrowStyles"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  useFloating, arrow, shift, flip, type Placement, offset, autoUpdate,
} from '@floating-ui/vue';
import {
  defineComponent, shallowRef, computed, ref, onUnmounted,
} from 'vue';
import { useResizeObserverPolyfill } from '@/presentation/components/Shared/Hooks/Resize/UseResizeObserverPolyfill';
import { throttle } from '@/application/Common/Timing/Throttle';
import { type TargetEventListener } from '@/presentation/components/Shared/Hooks/UseAutoUnsubscribedEventListener';
import { injectKey } from '@/presentation/injectionSymbols';
import { getArrowStyles } from './TooltipArrowStyles';
import type { CSSProperties } from 'vue';

const GAP_BETWEEN_TOOLTIP_AND_TRIGGER_IN_PX = 2;
const ARROW_SIZE_IN_PX = 4;

const DEFAULT_PLACEMENT: Placement = 'top';
const POINTER_HANDOFF_DELAY_IN_MS = 75;

interface ActiveTooltip {
  readonly identifier: symbol;
  readonly hide: () => void;
}

let activeTooltip: ActiveTooltip | undefined;

export default defineComponent({
  setup() {
    const tooltipDisplayElement = shallowRef<HTMLElement | undefined>();
    const triggeringElement = shallowRef<HTMLElement | undefined>();
    const arrowElement = shallowRef<HTMLElement | undefined>();

    const eventListener = injectKey((keys) => keys.useAutoUnsubscribedEventListener);
    useResizeObserverPolyfill();

    const {
      floatingStyles, middlewareData, placement, update,
    } = useFloating(
      triggeringElement,
      tooltipDisplayElement,
      {
        placement: DEFAULT_PLACEMENT,
        middleware: [
          offset(ARROW_SIZE_IN_PX + GAP_BETWEEN_TOOLTIP_AND_TRIGGER_IN_PX),
          /* Shifts the element along the specified axes in order to keep it in view. */
          shift(),
          /*  Changes the placement of the floating element in order to keep it in view,
              with the ability to flip to any placement. */
          flip(),
          arrow({ element: arrowElement }),
        ],
        whileElementsMounted: autoUpdate,
      },
    );

    /*
      Not using `float-ui`'s `autoUpdate` with `animationFrame: true` because it updates tooltips on
      every frame through `requestAnimationFrame`. This behavior is analogous to a continuous loop
      (often 60 updates per second and more depending on the refresh rate), which can be excessively
      performance-intensive. It's overkill for the application needs and a monkey solution due to
      its brute-force nature.
    */
    setupTransitionEndEvents(throttle(() => {
      update();
    }, 400, { excludeLeadingCall: true }), eventListener);

    const arrowStyles = computed<CSSProperties>(() => getArrowStyles({
      calculatedArrowCoords: middlewareData.value.arrow,
      tooltipPlacement: placement.value,
      arrowSizeInPx: ARROW_SIZE_IN_PX,
    }));

    const isTooltipVisible = ref(false);
    const tooltipIdentifier = Symbol('tooltip');
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    function clearScheduledHide() {
      if (hideTimer === undefined) {
        return;
      }
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }

    function hideTooltip() {
      clearScheduledHide();
      isTooltipVisible.value = false;
      if (activeTooltip?.identifier === tooltipIdentifier) {
        activeTooltip = undefined;
      }
    }

    function showTooltip() {
      clearScheduledHide();
      if (activeTooltip?.identifier !== tooltipIdentifier) {
        activeTooltip?.hide();
        activeTooltip = {
          identifier: tooltipIdentifier,
          hide: hideTooltip,
        };
      }
      isTooltipVisible.value = true;
    }

    function scheduleTooltipHide() {
      clearScheduledHide();
      hideTimer = setTimeout(hideTooltip, POINTER_HANDOFF_DELAY_IN_MS);
    }

    onUnmounted(() => {
      hideTooltip();
    });

    return {
      tooltipDisplayElement,
      triggeringElement,
      displayStyles: floatingStyles,
      arrowStyles,
      arrowElement,
      placement,
      isTooltipVisible,
      showTooltip,
      scheduleTooltipHide,
      hideTooltip,
    };
  },
});

function setupTransitionEndEvents(
  handler: () => void,
  listener: TargetEventListener,
) {
  const transitionEndEvents: readonly (keyof HTMLElementEventMap)[] = [
    'transitionend',
    'transitioncancel',
  ];
  transitionEndEvents.forEach((eventName) => {
    listener.startListening(document.body, eventName, handler);
  });
}
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

$color-tooltip-background: $color-primary-dark;

.tooltip {
  display: inline-flex;
}

@mixin fixed-fullscreen {
  /*
    This mixin removes the element from the normal document flow, ensuring that it does not disrupt the layout of other elements,
    such as causing unintended screen width expansion on smaller mobile screens.

    Setting `top`, `left`, `width` and `height` ensures that, the tooltip is prepared to cover the entire viewport, preventing it from
    being cropped or causing overflow issues. `pointer-events: none;` disables capturing all events on page.

    Other positioning alternatives considered:
    - Moving tooltip off the screen using `left` and `top` properties:
      - Causes unintended screen width expansion on smaller mobile screens.
      - Causes screen shaking on Chromium browsers.
    - `overflow: hidden`:
      - It does not work automatic positioning of tooltips.
    - `transform: translate(-100vw, -100vh)`:
      - Causes screen shaking on Chromium browsers.
  */
  position: fixed;

  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;

  pointer-events: none;
  overflow: hidden;
  > * { // Restore styles in children
    pointer-events: auto;
    overflow: unset;
  }
}

.tooltip__overlay {
  /*
    The z-index is set for both visible and invisible states to ensure it maintains its stacking order
    above other elements during transitions. This approach prevents the tooltip from falling behind other
    elements during the fade-in and fade-out animations.
  */
  z-index: 10;

  /*
    Reset white-space to the default value to prevent inheriting styles from the trigger element.
    This prevents unintentional layout issues or overflow.
  */
  white-space: normal;

  visibility: hidden;
  opacity: 0;

  @include fixed-fullscreen;

  &--visible {
    visibility: visible;
    opacity: 1;
    transition: opacity 150ms ease-out;
  }
}

.tooltip__content {
  background: $color-tooltip-background;
  color: $color-on-primary;
  border: 1px solid rgba($color-primary-light, 0.35);
  border-radius: 16px;
  padding: $spacing-absolute-large $spacing-absolute-medium;
  box-shadow: 0 16px 38px rgba($color-primary-darkest, 0.28);
  overflow: auto;
  overscroll-behavior: contain;

  // Explicitly set font styling for tooltips to prevent inconsistent appearances due to style inheritance from trigger elements.
  @include base-font-style;
  font-size: $font-size-absolute-small;
  line-height: 1.55;

  /*
    This margin creates a visual buffer between the tooltip and the edges of the document.
    It prevents the tooltip from appearing too close to the edges, ensuring a visually pleasing
    and balanced layout.
    Avoiding setting vertical margin as it disrupts the arrow rendering.
  */
  margin-left: $spacing-absolute-xx-small;
  margin-right: $spacing-absolute-xx-small;

  /*
    Keep long documentation readable without allowing it to cover the page.
    Content remains complete and scrollable, including links and code blocks.
  */
  max-width: min(50ch, calc(100vw - #{$spacing-absolute-xx-large}));
  max-height: min(65vh, 32rem);

  :deep(a[href]) {
    color: $color-secondary-light;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}

.tooltip__arrow {
  background: $color-tooltip-background;
}

@media (prefers-reduced-motion: reduce) {
  .tooltip__overlay--visible {
    transition: none;
  }
}
</style>
