import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { nextTick } from 'vue';
import { shallowMount } from '@vue/test-utils';
import ScriptListPanel from '@/presentation/components/Scripts/View/Selection/ScriptListPanel.vue';
import ScriptGroupSection from '@/presentation/components/Scripts/View/Selection/ScriptGroupSection.vue';
import type { ScriptGroup } from '@/presentation/components/Scripts/View/Selection/Model/ScriptGroup';

const DOM_SELECTOR_BODY = '.panel__body';

/* Far more rows than any first batch, so the tests hold however the batches are tuned. */
const LONG_GROUP_LENGTH = 1000;

describe('ScriptListPanel.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering a long list gradually', () => {
    it('renders only the first rows at once', () => {
      // arrange
      const groups = [createGroup('long', LONG_GROUP_LENGTH)];

      // act
      const wrapper = mountComponent(groups);

      // assert
      const sections = wrapper.findAllComponents(ScriptGroupSection);
      expect(sections).to.have.lengthOf(1);
      const renderedScriptCount = sections[0].props('renderedScriptCount');
      expect(renderedScriptCount).to.be.greaterThan(0);
      expect(renderedScriptCount).to.be.lessThan(LONG_GROUP_LENGTH);
    });

    it('leaves out the groups whose rows are not due yet', () => {
      // arrange
      const groups = [createGroup('first', LONG_GROUP_LENGTH), createGroup('second', 1)];

      // act
      const wrapper = mountComponent(groups);

      // assert
      const renderedGroups = wrapper.findAllComponents(ScriptGroupSection)
        .map((section) => section.props('group'));
      expect(renderedGroups).to.deep.equal([groups[0]]);
    });

    it('fills in the rest of the list over later tasks', async () => {
      // arrange
      const groups = [createGroup('first', LONG_GROUP_LENGTH), createGroup('second', 3)];
      const wrapper = mountComponent(groups);

      // act
      vi.runAllTimers();
      await nextTick();

      // assert
      const renderedScriptCounts = wrapper.findAllComponents(ScriptGroupSection)
        .map((section) => section.props('renderedScriptCount'));
      expect(renderedScriptCounts).to.deep.equal([LONG_GROUP_LENGTH, 3]);
    });

    it('hands every section its whole group, so its counts cover unrendered rows too', () => {
      // arrange
      const group = createGroup('long', LONG_GROUP_LENGTH);

      // act
      const wrapper = mountComponent([group]);

      // assert
      expect(wrapper.findComponent(ScriptGroupSection).props('group')).to.deep.equal(group);
    });

    it('marks the list as busy until every row is rendered', async () => {
      // arrange
      const wrapper = mountComponent([createGroup('long', LONG_GROUP_LENGTH)]);
      const busyWhileRendering = wrapper.find(DOM_SELECTOR_BODY).attributes('aria-busy');

      // act
      vi.runAllTimers();
      await nextTick();

      // assert
      expect(busyWhileRendering).to.equal('true');
      expect(wrapper.find(DOM_SELECTOR_BODY).attributes('aria-busy')).to.equal('false');
    });

    it('renders a short list completely at once', () => {
      // arrange
      const groups = [createGroup('first', 2), createGroup('second', 1)];

      // act
      const wrapper = mountComponent(groups);

      // assert
      const renderedScriptCounts = wrapper.findAllComponents(ScriptGroupSection)
        .map((section) => section.props('renderedScriptCount'));
      expect(renderedScriptCounts).to.deep.equal([2, 1]);
      expect(wrapper.find(DOM_SELECTOR_BODY).attributes('aria-busy')).to.equal('false');
    });

    it('starts over from the first rows when the list changes', async () => {
      // arrange
      const wrapper = mountComponent([createGroup('old', LONG_GROUP_LENGTH)]);
      vi.runAllTimers();
      await nextTick();
      const newGroup = createGroup('new', LONG_GROUP_LENGTH);

      // act
      await wrapper.setProps({ groups: [newGroup] });

      // assert
      const section = wrapper.findComponent(ScriptGroupSection);
      expect(section.props('group')).to.deep.equal(newGroup);
      expect(section.props('renderedScriptCount')).to.be.lessThan(LONG_GROUP_LENGTH);
    });

    it('stops rendering once unmounted', () => {
      // arrange
      const wrapper = mountComponent([createGroup('long', LONG_GROUP_LENGTH)]);

      // act
      wrapper.unmount();

      // assert
      expect(vi.getTimerCount()).to.equal(0);
    });
  });
});

function createGroup(name: string, scriptCount: number): ScriptGroup {
  return {
    categoryId: `${name}-category`,
    name,
    docs: [],
    scripts: Array.from({ length: scriptCount }, (_, index) => ({
      scriptId: `${name}-script-${index}`,
      name: `${name} script ${index}`,
      docs: [],
      isReversible: false,
    })),
  };
}

function mountComponent(groups: readonly ScriptGroup[]) {
  return shallowMount(ScriptListPanel, {
    props: {
      groups,
      selectedScriptIds: new Set<string>(),
      revertedStatusByScriptId: new Map<string, boolean>(),
    },
  });
}
