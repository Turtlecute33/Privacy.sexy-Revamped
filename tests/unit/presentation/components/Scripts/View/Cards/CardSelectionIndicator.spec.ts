import { shallowMount } from '@vue/test-utils';
import {
  describe, expect, it, vi,
} from 'vitest';
import CardSelectionIndicator from '@/presentation/components/Scripts/View/Cards/CardSelectionIndicator.vue';
import { InjectionKeys } from '@/presentation/injectionSymbols';
import { CategoryCollectionStateStub } from '@tests/unit/shared/Stubs/CategoryCollectionStateStub';
import { CategoryCollectionStub } from '@tests/unit/shared/Stubs/CategoryCollectionStub';
import { CategorySelectionStub } from '@tests/unit/shared/Stubs/CategorySelectionStub';
import { CategoryStub } from '@tests/unit/shared/Stubs/CategoryStub';
import { UseCollectionStateStub } from '@tests/unit/shared/Stubs/UseCollectionStateStub';
import { UseUserSelectionStateStub } from '@tests/unit/shared/Stubs/UseUserSelectionStateStub';
import { UserSelectionStub } from '@tests/unit/shared/Stubs/UserSelectionStub';

const CATEGORY_ID = 'test-category';
const MARK_SELECTOR = '.selection-indicator__mark';

describe('CardSelectionIndicator.vue', () => {
  it('renders no status when the category has no selected scripts', () => {
    const wrapper = mountComponent({
      isAnySelected: false,
      areAllSelected: false,
    });

    expect(wrapper.find(MARK_SELECTOR).exists()).to.equal(false, wrapper.html());
  });

  it('renders a partial status when some scripts are selected', () => {
    const wrapper = mountComponent({
      isAnySelected: true,
      areAllSelected: false,
    });

    const mark = wrapper.find(MARK_SELECTOR);
    expect(mark.classes()).to.include('selection-indicator__mark--partial');
    expect(wrapper.text()).to.equal('Some selected');
  });

  it('renders a complete status when every script is selected', () => {
    const wrapper = mountComponent({
      isAnySelected: true,
      areAllSelected: true,
    });

    const mark = wrapper.find(MARK_SELECTOR);
    expect(mark.classes()).to.include('selection-indicator__mark--all');
    expect(wrapper.text()).to.equal('All selected');
  });
});

function mountComponent(selectionState: {
  readonly isAnySelected: boolean,
  readonly areAllSelected: boolean,
}) {
  const category = new CategoryStub(CATEGORY_ID).withScriptIds('script-1', 'script-2');
  const collection = new CategoryCollectionStub().withAction(category);
  const collectionState = new CategoryCollectionStateStub().withCollection(collection);
  const useCollectionState = new UseCollectionStateStub().withState(collectionState);

  const categorySelection = new CategorySelectionStub();
  vi.spyOn(categorySelection, 'isAnyScriptSelected')
    .mockReturnValue(selectionState.isAnySelected);
  vi.spyOn(categorySelection, 'areAllScriptsSelected')
    .mockReturnValue(selectionState.areAllSelected);
  const userSelection = new UserSelectionStub().withCategories(categorySelection);
  const useUserSelectionState = new UseUserSelectionStateStub().withUserSelection(userSelection);

  return shallowMount(CardSelectionIndicator, {
    props: {
      categoryId: CATEGORY_ID,
    },
    global: {
      provide: {
        [InjectionKeys.useCollectionState.key]: () => useCollectionState.get(),
        [InjectionKeys.useUserSelectionState.key]: () => useUserSelectionState.get(),
      },
    },
  });
}
