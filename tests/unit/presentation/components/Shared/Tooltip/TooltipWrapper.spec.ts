import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { h, nextTick, ref } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { InjectionKeys } from '@/presentation/injectionSymbols';
import TooltipWrapper from '@/presentation/components/Shared/Tooltip/TooltipWrapper.vue';
import { UseEventListenerStub } from '@tests/unit/shared/Stubs/UseEventListenerStub';
import { useAutoUnsubscribedEventListener, type UseEventListener } from '@/presentation/components/Shared/Hooks/UseAutoUnsubscribedEventListener';
import type { Mock } from 'vitest';
import type { Ref, VNode } from 'vue';

/*
  The mock records what the component hands to `useFloating` so the tests can assert the
  deferral itself. Asserting only the `has-been-shown` slot prop would let the floating element
  be passed at mount again (a one-token change) without a single test failing, which is exactly
  the mount-time `computePosition`/`autoUpdate` storm the deferral exists to prevent.
*/
let floatingElementArgument: Readonly<Ref<HTMLElement | undefined>> | undefined;
let positionUpdate: Mock | undefined;

vi.mock('@floating-ui/vue', () => ({
  arrow: vi.fn(),
  autoUpdate: vi.fn(),
  flip: vi.fn(),
  offset: vi.fn(),
  shift: vi.fn(),
  useFloating: (
    _referenceElement: Readonly<Ref<HTMLElement | undefined>>,
    floatingElement: Readonly<Ref<HTMLElement | undefined>>,
  ) => {
    floatingElementArgument = floatingElement;
    positionUpdate = vi.fn();
    return {
      floatingStyles: ref({}),
      middlewareData: ref({}),
      placement: ref('top'),
      update: positionUpdate,
    };
  },
}));

const DOM_SELECTOR_TRIGGER = '.tooltip__trigger';
const DOM_SELECTOR_OVERLAY = '.tooltip__overlay';
const DOM_SELECTOR_DISPLAY = '.tooltip__display';
const DOM_CLASS_VISIBLE = 'tooltip__overlay--visible';
const DOM_CLASS_SLOT_STATE = 'slot-state';
const POINTER_HANDOFF_DELAY_IN_MS = 75;
const TRANSITION_UPDATE_THROTTLE_IN_MS = 400;

type TooltipSlot = string | ((props: { readonly hasBeenShown: boolean }) => VNode);

describe('TooltipWrapper.vue', () => {
  beforeEach(() => {
    // A test that mounts more than one wrapper would otherwise leave the previous test's last one.
    floatingElementArgument = undefined;
    positionUpdate = undefined;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('keeps the tooltip open while the pointer moves from its trigger to its content', async () => {
    // arrange
    const wrapper = mountComponent('Trigger');
    const trigger = wrapper.find(DOM_SELECTOR_TRIGGER);
    const tooltipDisplay = wrapper.find(DOM_SELECTOR_DISPLAY);

    // act
    await trigger.trigger('mouseenter');
    await trigger.trigger('mouseleave');
    await tooltipDisplay.trigger('mouseenter');
    vi.advanceTimersByTime(POINTER_HANDOFF_DELAY_IN_MS);

    // assert
    expect(isTooltipVisible(wrapper)).to.equal(true);
    expect(wrapper.find('a').attributes('href')).to.equal('#details');

    wrapper.unmount();
  });

  it('closes immediately when the pointer leaves the tooltip content', async () => {
    // arrange
    const wrapper = mountComponent('Trigger');
    const tooltipDisplay = wrapper.find(DOM_SELECTOR_DISPLAY);
    await tooltipDisplay.trigger('mouseenter');

    // act
    await tooltipDisplay.trigger('mouseleave');

    // assert
    expect(isTooltipVisible(wrapper)).to.equal(false);

    wrapper.unmount();
  });

  it('allows links inside the tooltip content to be clicked', async () => {
    // arrange
    const wrapper = mountComponent('Trigger');
    const clickHandler = vi.fn((event: MouseEvent) => event.preventDefault());
    await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');
    const link = wrapper.find('a');
    link.element.addEventListener('click', clickHandler);
    await wrapper.find(DOM_SELECTOR_DISPLAY).trigger('mouseenter');

    // act
    await link.trigger('click');

    // assert
    expect(clickHandler).toHaveBeenCalledOnce();
    expect(isTooltipVisible(wrapper)).to.equal(true);

    wrapper.unmount();
  });

  it('closes the previously active tooltip when another tooltip opens', async () => {
    // arrange
    const firstTooltip = mountComponent('First trigger');
    const secondTooltip = mountComponent('Second trigger');
    await firstTooltip.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');

    // act
    await secondTooltip.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');

    // assert
    expect(isTooltipVisible(firstTooltip)).to.equal(false);
    expect(isTooltipVisible(secondTooltip)).to.equal(true);

    firstTooltip.unmount();
    secondTooltip.unmount();
  });

  it('tells the tooltip slot when the tooltip has been opened for the first time', async () => {
    // arrange
    const wrapper = mountComponent(
      'Trigger',
      ({ hasBeenShown }) => h('span', { class: DOM_CLASS_SLOT_STATE }, `${hasBeenShown}`),
    );
    const stateBeforeFirstOpen = wrapper.find(`.${DOM_CLASS_SLOT_STATE}`).text();

    // act
    await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');

    // assert
    expect(stateBeforeFirstOpen).to.equal('false');
    expect(wrapper.find(`.${DOM_CLASS_SLOT_STATE}`).text()).to.equal('true');

    wrapper.unmount();
  });

  it('withholds the floating element from the positioner until the first open', async () => {
    // arrange
    const wrapper = mountComponent('Trigger');
    const floatingElementBeforeFirstOpen = floatingElementArgument?.value;

    // act
    await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');

    // assert
    expect(floatingElementBeforeFirstOpen).to.equal(undefined);
    expect(floatingElementArgument?.value).to.equal(wrapper.find(DOM_SELECTOR_DISPLAY).element);

    wrapper.unmount();
  });

  it('re-measures the position once the revealed content is rendered', async () => {
    // arrange
    const wrapper = mountComponent('Trigger');
    const updateCallsBeforeFirstOpen = positionUpdate?.mock.calls.length;

    // act
    await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');

    // assert
    expect(updateCallsBeforeFirstOpen).to.equal(0);
    expect(positionUpdate).toHaveBeenCalledOnce();

    wrapper.unmount();
  });

  it('stops positioning the tooltip once it closes', async () => {
    // arrange
    const wrapper = mountComponent('Trigger');
    const tooltipDisplay = wrapper.find(DOM_SELECTOR_DISPLAY);
    await tooltipDisplay.trigger('mouseenter');
    const floatingElementWhileOpen = floatingElementArgument?.value;

    // act
    await tooltipDisplay.trigger('mouseleave');

    // assert
    expect(floatingElementWhileOpen).to.equal(tooltipDisplay.element);
    expect(floatingElementArgument?.value).to.equal(undefined);

    wrapper.unmount();
  });

  it('positions the tooltip again when it reopens', async () => {
    // arrange
    const wrapper = mountComponent('Trigger');
    const tooltipDisplay = wrapper.find(DOM_SELECTOR_DISPLAY);
    await tooltipDisplay.trigger('mouseenter');
    await tooltipDisplay.trigger('mouseleave');

    // act
    await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');

    // assert
    expect(floatingElementArgument?.value).to.equal(tooltipDisplay.element);

    wrapper.unmount();
  });

  it('keeps the tooltip content rendered after it closes', async () => {
    // arrange
    const wrapper = mountComponent(
      'Trigger',
      ({ hasBeenShown }) => h('span', { class: DOM_CLASS_SLOT_STATE }, `${hasBeenShown}`),
    );
    const tooltipDisplay = wrapper.find(DOM_SELECTOR_DISPLAY);
    await tooltipDisplay.trigger('mouseenter');

    // act
    await tooltipDisplay.trigger('mouseleave');

    // assert
    expect(isTooltipVisible(wrapper)).to.equal(false);
    expect(wrapper.find(`.${DOM_CLASS_SLOT_STATE}`).text()).to.equal('true');

    wrapper.unmount();
  });

  describe('repositioning after transitions on the page', () => {
    it('repositions while visible', async () => {
      // arrange
      const wrapper = mountComponent('Trigger', undefined, useAutoUnsubscribedEventListener);
      await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');
      positionUpdate?.mockClear();

      // act
      document.body.dispatchEvent(new Event('transitionend'));
      vi.advanceTimersByTime(TRANSITION_UPDATE_THROTTLE_IN_MS);

      // assert
      expect(positionUpdate).toHaveBeenCalledOnce();

      wrapper.unmount();
    });

    it('does not listen before the tooltip is first opened', () => {
      // arrange
      const wrapper = mountComponent('Trigger', undefined, useAutoUnsubscribedEventListener);

      // act
      document.body.dispatchEvent(new Event('transitionend'));
      vi.advanceTimersByTime(TRANSITION_UPDATE_THROTTLE_IN_MS);

      // assert
      expect(positionUpdate).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('stops listening once the tooltip has closed', async () => {
      // arrange
      const wrapper = mountComponent('Trigger', undefined, useAutoUnsubscribedEventListener);
      const tooltipDisplay = wrapper.find(DOM_SELECTOR_DISPLAY);
      await tooltipDisplay.trigger('mouseenter');
      await tooltipDisplay.trigger('mouseleave');
      vi.runOnlyPendingTimers();
      positionUpdate?.mockClear();

      // act
      document.body.dispatchEvent(new Event('transitionend'));
      document.body.dispatchEvent(new Event('transitioncancel'));
      vi.advanceTimersByTime(TRANSITION_UPDATE_THROTTLE_IN_MS);

      // assert
      expect(positionUpdate).not.toHaveBeenCalled();

      wrapper.unmount();
    });
  });

  describe('dismissing with Escape', () => {
    it('closes the visible tooltip', async () => {
      // arrange
      const wrapper = mountComponent('Trigger');
      await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('focusin');

      // act
      pressKey('Escape');
      await nextTick();

      // assert
      expect(isTooltipVisible(wrapper)).to.equal(false);

      wrapper.unmount();
    });

    it('stays open when another key is pressed', async () => {
      // arrange
      const wrapper = mountComponent('Trigger');
      await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('focusin');

      // act
      pressKey('Enter');
      await nextTick();

      // assert
      expect(isTooltipVisible(wrapper)).to.equal(true);

      wrapper.unmount();
    });

    it('keeps the Escape that closed it from also closing an enclosing modal', async () => {
      // arrange
      const wrapper = mountComponent('Trigger');
      await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');
      const modalEscapeListener = vi.fn();
      document.addEventListener('keyup', modalEscapeListener);

      // act
      pressKey('Escape');
      await nextTick();

      // assert
      expect(modalEscapeListener).not.toHaveBeenCalled();

      document.removeEventListener('keyup', modalEscapeListener);
      wrapper.unmount();
    });

    it('lets Escape through while the tooltip is closed', async () => {
      // arrange
      const wrapper = mountComponent('Trigger');
      const tooltipDisplay = wrapper.find(DOM_SELECTOR_DISPLAY);
      await tooltipDisplay.trigger('mouseenter');
      await tooltipDisplay.trigger('mouseleave');
      const modalEscapeListener = vi.fn();
      document.addEventListener('keyup', modalEscapeListener);

      // act
      pressKey('Escape');

      // assert
      expect(modalEscapeListener).toHaveBeenCalledOnce();

      document.removeEventListener('keyup', modalEscapeListener);
      wrapper.unmount();
    });

    it('lets Escape through once the tooltip is unmounted', async () => {
      // arrange
      const wrapper = mountComponent('Trigger');
      await wrapper.find(DOM_SELECTOR_TRIGGER).trigger('mouseenter');
      const modalEscapeListener = vi.fn();
      document.addEventListener('keyup', modalEscapeListener);

      // act
      wrapper.unmount();
      pressKey('Escape');

      // assert
      expect(modalEscapeListener).toHaveBeenCalledOnce();

      document.removeEventListener('keyup', modalEscapeListener);
    });
  });

  it('closes after the handoff window when the pointer leaves the trigger', async () => {
    // arrange
    const wrapper = mountComponent('Trigger');
    const trigger = wrapper.find(DOM_SELECTOR_TRIGGER);
    await trigger.trigger('mouseenter');

    // act
    await trigger.trigger('mouseleave');
    vi.advanceTimersByTime(POINTER_HANDOFF_DELAY_IN_MS);
    await nextTick();

    // assert
    expect(isTooltipVisible(wrapper)).to.equal(false);

    wrapper.unmount();
  });
});

function mountComponent(
  triggerText: string,
  tooltipSlot: TooltipSlot = '<a href="#details">Read details</a>',
  useEventListener: UseEventListener = new UseEventListenerStub().get(),
) {
  return shallowMount(TooltipWrapper, {
    slots: {
      default: `<button>${triggerText}</button>`,
      tooltip: tooltipSlot,
    },
    global: {
      provide: {
        [InjectionKeys.useAutoUnsubscribedEventListener.key]: useEventListener,
      },
    },
  });
}

function pressKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
}

function isTooltipVisible(wrapper: ReturnType<typeof mountComponent>): boolean {
  return wrapper.find(DOM_SELECTOR_OVERLAY).classes().includes(DOM_CLASS_VISIBLE);
}
