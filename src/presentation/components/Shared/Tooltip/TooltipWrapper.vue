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
          <!--
            `has-been-shown` lets consumers with expensive tooltip bodies keep them out of the
            document until the first hover. The wrapper's own elements stay mounted so that styles,
            the arrow and any `aria-describedby` target remain valid at all times.
          -->
          <slot
            name="tooltip"
            :has-been-shown="hasBeenShown"
          />
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
  defineComponent, shallowRef, computed, ref, onUnmounted, nextTick, watch,
} from 'vue';
import { useResizeObserverPolyfill } from '@/presentation/components/Shared/Hooks/Resize/UseResizeObserverPolyfill';
import { throttle } from '@/application/Common/Timing/Throttle';
import { type TargetEventListener } from '@/presentation/components/Shared/Hooks/UseAutoUnsubscribedEventListener';
import { injectKey } from '@/presentation/injectionSymbols';
import { getArrowStyles } from './TooltipArrowStyles';
import type { CSSProperties, Ref } from 'vue';

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

    const isTooltipVisible = ref(false);

    /*
      Only the first open renders the tooltip body (see the `has-been-shown` slot prop); it then
      stays rendered, so later opens do not rebuild it.
    */
    const hasBeenShown = ref(false);

    /*
      The tooltip overlay is hidden with `visibility`/`opacity` rather than `display: none`, so its
      floating element is in the DOM from the very first paint. Handing that element to
      `useFloating` permanently would make every tooltip on the page run `computePosition` and
      install `autoUpdate` (two `ResizeObserver`s, an `IntersectionObserver` and ancestor
      scroll/resize listeners each), with no user interaction. On the scripts view that is one per
      script row, and the dominant contributor to Lighthouse's "Forced reflow" insight.

      Handing it over only while the tooltip is visible avoids all of it: `useFloating`'s
      `update()` early-returns while the floating ref is nullish, and its `attach()` skips
      `whileElementsMounted` entirely. The watcher that calls `attach()` is `flush: 'sync'`, so
      positioning starts the instant the tooltip opens and `autoUpdate` is torn down the instant it
      closes. Gating on the first open alone was not enough: every tooltip ever hovered kept
      re-measuring on each scroll and resize for the rest of the visit, so the cost grew the longer
      someone browsed.
    */
    const floatingElementWhileVisible = computed(
      () => (isTooltipVisible.value ? tooltipDisplayElement.value : undefined),
    );

    const {
      floatingStyles, middlewareData, placement, update,
    } = useFloating(
      triggeringElement,
      floatingElementWhileVisible,
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

      The listeners are attached only while the tooltip is visible. A closed tooltip has nothing to
      reposition, and a page-wide listener per mounted tooltip meant that every transition anywhere
      on the page ran one throttled handler for each tooltip in the document.
    */
    setupTransitionEndEvents(throttle(() => {
      update();
    }, 400, { excludeLeadingCall: true }), eventListener, computed(
      () => (isTooltipVisible.value ? document.body : undefined),
    ));

    const arrowStyles = computed<CSSProperties>(() => getArrowStyles({
      calculatedArrowCoords: middlewareData.value.arrow,
      tooltipPlacement: placement.value,
      arrowSizeInPx: ARROW_SIZE_IN_PX,
    }));

    dismissOnEscape(isTooltipVisible, () => hideTooltip());

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
      const isFirstOpen = !hasBeenShown.value;
      hasBeenShown.value = true;
      isTooltipVisible.value = true;
      if (isFirstOpen) {
        /*
          Opening the gate re-attaches `useFloating` synchronously, which measures the floating
          element before Vue has rendered the content this same open just revealed. That first
          measurement sees an empty box and places the tooltip wrongly, so it is re-run once the
          revealed content is in the DOM.
        */
        nextTick(() => update());
      }
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
      hasBeenShown,
      showTooltip,
      scheduleTooltipHide,
      hideTooltip,
    };
  },
});

function setupTransitionEndEvents(
  handler: () => void,
  listener: TargetEventListener,
  target: Readonly<Ref<HTMLElement | undefined>>,
) {
  const transitionEndEvents: readonly (keyof HTMLElementEventMap)[] = [
    'transitionend',
    'transitioncancel',
  ];
  transitionEndEvents.forEach((eventName) => {
    listener.startListening(target, eventName, handler);
  });
}

/*
  Content that appears on hover or focus must be dismissible without moving the pointer or the
  focus (WCAG 2.1, 1.4.13 Content on Hover or Focus), and Escape is the expected way to do it.

  It listens for `keyup`, in the capture phase on `window`, and stops the event there, because
  tooltips also open inside modals, and `ModalContainer` closes on an Escape `keyup` heard on the
  document. Capturing on `window` runs before that listener, so one press closes the tooltip and
  only the next one closes the modal, rather than one press dismissing both layers at once. It is
  attached only while the tooltip is visible, so it never swallows an Escape meant for anything
  else.
*/
function dismissOnEscape(
  isVisible: Readonly<Ref<boolean>>,
  dismiss: () => void,
): void {
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    event.stopPropagation();
    dismiss();
  };
  const listenerOptions: AddEventListenerOptions = { capture: true };
  watch(isVisible, (isNowVisible, _, onCleanup) => {
    if (!isNowVisible) {
      return;
    }
    window.addEventListener('keyup', onKeyUp, listenerOptions);
    onCleanup(() => window.removeEventListener('keyup', onKeyUp, listenerOptions));
  });
}
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

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

  @include fixed-fullscreen;

  &--visible {
    visibility: visible;
  }
}

/*
  The glass sits on the floating element and the fade runs on its layers, never on an ancestor of
  them. `opacity` below 1 on an ancestor cuts off what `backdrop-filter` can see, so fading the
  overlay (or the glass host) showed an unblurred pane for the whole transition and then snapped
  to frosted glass at the end. The frosted layers and the text fade side by side instead.
*/
.tooltip__display {
  @include glass-surface($radius: 16px, $tint: var(--glass-tint-strong), $frosted: true);
  transition: box-shadow 160ms $motion-ease-standard;

  &::before,
  &::after {
    opacity: 0;
    transition: opacity 160ms $motion-ease-standard;
  }

  .tooltip__overlay:not(.tooltip__overlay--visible) & {
    box-shadow: none;
  }

  .tooltip__overlay--visible &::before,
  .tooltip__overlay--visible &::after {
    opacity: 1;
  }
}

.tooltip__content {
  color: var(--text);
  padding: 12px 16px;
  overflow: auto;
  overscroll-behavior: contain;
  opacity: 0;
  transform: translateY(3px);
  transition:
    opacity 160ms $motion-ease-standard,
    transform 240ms $motion-ease-out;

  .tooltip__overlay--visible & {
    opacity: 1;
    transform: none;
  }

  // Explicitly set font styling for tooltips to prevent inconsistent appearances due to style inheritance from trigger elements.
  @include base-font-style;
  font-size: $font-size-absolute-small;
  line-height: 1.55;

  /*
    Keep long documentation readable without allowing it to cover the page.
    Content remains complete and scrollable, including links and code blocks.
  */
  max-width: min(52ch, calc(100vw - #{$spacing-absolute-xx-large}));
  max-height: min(65vh, 32rem);

  :deep(a[href]) {
    color: var(--accent-text);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  :deep(.markdown-text) {
    font-size: $font-size-absolute-small;
  }
}

/* A floating glass card needs no pointer; the gap to its trigger already says where it came from. */
.tooltip__arrow {
  visibility: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .tooltip__content {
    transform: none;
  }
}
</style>
