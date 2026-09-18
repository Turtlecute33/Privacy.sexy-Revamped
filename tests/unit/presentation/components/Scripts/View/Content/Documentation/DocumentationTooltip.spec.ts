import { describe, expect, it } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import DocumentationTooltip from '@/presentation/components/Scripts/View/Content/Documentation/DocumentationTooltip.vue';
import DocumentationText from '@/presentation/components/Scripts/View/Content/Documentation/DocumentationText.vue';

const DOM_SELECTOR_TRIGGER = '.documentation-tooltip__trigger';
const DOM_SELECTOR_TOOLTIP = '[role="tooltip"]';

describe('DocumentationTooltip.vue', () => {
  it('renders a non-button information trigger', () => {
    // act
    const wrapper = mountComponent();

    // assert
    const trigger = wrapper.find(DOM_SELECTOR_TRIGGER);
    expect(trigger.element.tagName).to.equal('SPAN');
    expect(trigger.attributes('role')).to.equal('img');
    expect(trigger.attributes('tabindex')).to.equal('0');
    expect(wrapper.find('button').exists()).to.equal(false);
  });

  it('associates the trigger with the tooltip for assistive technologies', () => {
    // act
    const wrapper = mountComponent();

    // assert
    const trigger = wrapper.find(DOM_SELECTOR_TRIGGER);
    const tooltip = wrapper.find(DOM_SELECTOR_TOOLTIP);
    expect(trigger.attributes('aria-describedby')).to.equal(tooltip.attributes('id'));
  });

  it('renders the provided documentation in the tooltip', () => {
    // arrange
    const expectedDocs = ['First documentation entry.', 'Second documentation entry.'];

    // act
    const wrapper = mountComponent({ docsPropValue: expectedDocs });

    // assert
    const documentation = wrapper.findComponent(DocumentationText);
    expect(documentation.props('docs')).to.deep.equal(expectedDocs);
  });

  it('keeps the documentation out of the document until the tooltip is first opened', () => {
    // act
    const wrapper = mountComponent({ hasTooltipBeenShown: false });

    // assert
    expect(wrapper.findComponent(DocumentationText).exists()).to.equal(false);
    // The labelled container must survive so that the trigger's `aria-describedby` still resolves.
    expect(wrapper.find(DOM_SELECTOR_TOOLTIP).exists()).to.equal(true);
  });
});

function mountComponent(options?: {
  readonly docsPropValue?: readonly string[],
  readonly hasTooltipBeenShown?: boolean,
}) {
  const hasBeenShown = options?.hasTooltipBeenShown ?? true;
  return shallowMount(DocumentationTooltip, {
    props: {
      docs: options?.docsPropValue ?? ['Stub documentation.'],
    },
    global: {
      stubs: {
        /*
          The stub mirrors `TooltipWrapper`'s scoped-slot contract so the tests exercise the same
          prop name the real wrapper exposes. `true` is the default because most cases want the
          opened tooltip; only the deferral test opts into `false`.
        */
        TooltipWrapper: {
          template: `
            <div>
              <slot />
              <slot name="tooltip" :has-been-shown="hasBeenShown" />
            </div>
          `,
          setup: () => ({ hasBeenShown }),
        },
      },
    },
  });
}
