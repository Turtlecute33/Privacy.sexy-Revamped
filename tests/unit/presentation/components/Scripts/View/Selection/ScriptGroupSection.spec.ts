import { describe, expect, it } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import ScriptGroupSection from '@/presentation/components/Scripts/View/Selection/ScriptGroupSection.vue';
import ScriptRow from '@/presentation/components/Scripts/View/Selection/ScriptRow.vue';
import SelectionCheckbox from '@/presentation/components/Scripts/View/Selection/SelectionCheckbox.vue';
import { InjectionKeys } from '@/presentation/injectionSymbols';
import { UserSelectionStub } from '@tests/unit/shared/Stubs/UserSelectionStub';
import { ScriptSelectionStub } from '@tests/unit/shared/Stubs/ScriptSelectionStub';
import type { ScriptGroup } from '@/presentation/components/Scripts/View/Selection/Model/ScriptGroup';
import type { SelectionModifier } from '@/presentation/components/Shared/Hooks/UseUserSelectionState';
import type { ExecutableId } from '@/domain/Executables/Identifiable';

const DOM_SELECTOR_COUNT = '.group__count';

describe('ScriptGroupSection.vue', () => {
  describe('rendering part of the group', () => {
    it('renders only as many rows as it is given', () => {
      // arrange
      const group = createGroup(5);

      // act
      const wrapper = mountComponent({ group, renderedScriptCount: 2 });

      // assert
      const renderedScriptIds = wrapper.findAllComponents(ScriptRow)
        .map((row) => row.props('script').scriptId);
      expect(renderedScriptIds).to.deep.equal(group.scripts.slice(0, 2).map((s) => s.scriptId));
    });

    it('renders every row when no count is given', () => {
      // arrange
      const group = createGroup(5);

      // act
      const wrapper = mountComponent({ group });

      // assert
      expect(wrapper.findAllComponents(ScriptRow)).to.have.lengthOf(group.scripts.length);
    });

    it('counts the whole group in its header', () => {
      // arrange
      const group = createGroup(5);
      const selectedScriptIds = new Set([group.scripts[4].scriptId]);

      // act
      const wrapper = mountComponent({ group, renderedScriptCount: 2, selectedScriptIds });

      // assert
      expect(wrapper.find(DOM_SELECTOR_COUNT).text().replace(/\s/g, '')).to.equal('1/5');
    });

    it('selects the whole group, including rows that are not rendered yet', async () => {
      // arrange
      const group = createGroup(5);
      const scriptSelection = new ScriptSelectionStub();
      const wrapper = mountComponent({ group, renderedScriptCount: 2, scriptSelection });

      // act
      wrapper.findComponent(SelectionCheckbox).vm.$emit('change', true);

      // assert
      scriptSelection.assertSelectionChanges(group.scripts.map((script) => ({
        scriptId: script.scriptId,
        newStatus: { isSelected: true, isReverted: false },
      })));
    });
  });
});

function createGroup(scriptCount: number): ScriptGroup {
  return {
    categoryId: 'category',
    name: 'Group',
    docs: [],
    scripts: Array.from({ length: scriptCount }, (_, index) => ({
      scriptId: `script-${index}`,
      name: `Script ${index}`,
      docs: [],
      isReversible: false,
    })),
  };
}

function mountComponent(options: {
  readonly group: ScriptGroup,
  readonly renderedScriptCount?: number,
  readonly selectedScriptIds?: ReadonlySet<ExecutableId>,
  readonly scriptSelection?: ScriptSelectionStub,
}) {
  const selection = new UserSelectionStub()
    .withScripts(options.scriptSelection ?? new ScriptSelectionStub());
  return shallowMount(ScriptGroupSection, {
    props: {
      group: options.group,
      renderedScriptCount: options.renderedScriptCount,
      selectedScriptIds: options.selectedScriptIds ?? new Set<ExecutableId>(),
      revertedStatusByScriptId: new Map(),
    },
    global: {
      provide: {
        [InjectionKeys.useUserSelectionState.key]: () => ({
          modifyCurrentSelection: (mutator: SelectionModifier) => mutator(selection),
        }),
      },
    },
  });
}
