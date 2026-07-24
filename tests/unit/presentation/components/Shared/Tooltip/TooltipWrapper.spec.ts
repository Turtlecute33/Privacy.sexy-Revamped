import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { nextTick, ref } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { InjectionKeys } from '@/presentation/injectionSymbols';
import TooltipWrapper from '@/presentation/components/Shared/Tooltip/TooltipWrapper.vue';
import { UseEventListenerStub } from '@tests/unit/shared/Stubs/UseEventListenerStub';

vi.mock('@floating-ui/vue', () => ({
  arrow: vi.fn(),
  autoUpdate: vi.fn(),
  flip: vi.fn(),
  offset: vi.fn(),
  shift: vi.fn(),
  useFloating: () => ({
    floatingStyles: ref({}),
    middlewareData: ref({}),
    placement: ref('top'),
    update: vi.fn(),
  }),
}));

const DOM_SELECTOR_TRIGGER = '.tooltip__trigger';
const DOM_SELECTOR_OVERLAY = '.tooltip__overlay';
const DOM_SELECTOR_DISPLAY = '.tooltip__display';
const DOM_CLASS_VISIBLE = 'tooltip__overlay--visible';
const POINTER_HANDOFF_DELAY_IN_MS = 75;

describe('TooltipWrapper.vue', () => {
  beforeEach(() => {
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

function mountComponent(triggerText: string) {
  return shallowMount(TooltipWrapper, {
    slots: {
      default: `<button>${triggerText}</button>`,
      tooltip: '<a href="#details">Read details</a>',
    },
    global: {
      provide: {
        [InjectionKeys.useAutoUnsubscribedEventListener.key]:
          new UseEventListenerStub().get(),
      },
    },
  });
}

function isTooltipVisible(wrapper: ReturnType<typeof mountComponent>): boolean {
  return wrapper.find(DOM_SELECTOR_OVERLAY).classes().includes(DOM_CLASS_VISIBLE);
}
