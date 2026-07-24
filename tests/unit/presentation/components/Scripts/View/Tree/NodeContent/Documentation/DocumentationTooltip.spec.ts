import { describe, expect, it } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import DocumentationTooltip from '@/presentation/components/Scripts/View/Tree/NodeContent/Documentation/DocumentationTooltip.vue';
import DocumentationText from '@/presentation/components/Scripts/View/Tree/NodeContent/Documentation/DocumentationText.vue';

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
    const wrapper = mountComponent(expectedDocs);

    // assert
    const documentation = wrapper.findComponent(DocumentationText);
    expect(documentation.props('docs')).to.deep.equal(expectedDocs);
  });
});

function mountComponent(docs: readonly string[] = ['Stub documentation.']) {
  return shallowMount(DocumentationTooltip, {
    props: {
      docs,
    },
    global: {
      stubs: {
        TooltipWrapper: {
          template: `
            <div>
              <slot />
              <slot name="tooltip" />
            </div>
          `,
        },
      },
    },
  });
}
