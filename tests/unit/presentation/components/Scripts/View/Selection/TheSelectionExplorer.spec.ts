import { describe, expect, it } from 'vitest';
import { shallowRef } from 'vue';
import { shallowMount } from '@vue/test-utils';
import TheSelectionExplorer from '@/presentation/components/Scripts/View/Selection/TheSelectionExplorer.vue';
import CategoryRail from '@/presentation/components/Scripts/View/Selection/CategoryRail.vue';
import ScriptListPanel from '@/presentation/components/Scripts/View/Selection/ScriptListPanel.vue';
import { InjectionKeys } from '@/presentation/injectionSymbols';
import { UseCollectionStateStub } from '@tests/unit/shared/Stubs/UseCollectionStateStub';
import { CategoryCollectionStateStub } from '@tests/unit/shared/Stubs/CategoryCollectionStateStub';
import { CategoryCollectionStub } from '@tests/unit/shared/Stubs/CategoryCollectionStub';
import { CategoryStub } from '@tests/unit/shared/Stubs/CategoryStub';
import { ScriptStub } from '@tests/unit/shared/Stubs/ScriptStub';
import { UserSelectionStub } from '@tests/unit/shared/Stubs/UserSelectionStub';

const FIRST_CATEGORY_ID = 'first-category';
const SECOND_CATEGORY_ID = 'second-category';

describe('TheSelectionExplorer.vue', () => {
  it('opens the category it is given', () => {
    // act
    const wrapper = mountComponent({ activeCategoryId: SECOND_CATEGORY_ID });

    // assert
    expect(getOpenCategoryId(wrapper)).to.equal(SECOND_CATEGORY_ID);
  });

  it('opens the first category when it is given none', () => {
    // act
    const wrapper = mountComponent({ activeCategoryId: undefined });

    // assert
    expect(getOpenCategoryId(wrapper)).to.equal(FIRST_CATEGORY_ID);
  });

  it('opens the first category when the given one is not in the collection', () => {
    // act
    const wrapper = mountComponent({ activeCategoryId: 'category-of-another-collection' });

    // assert
    expect(getOpenCategoryId(wrapper)).to.equal(FIRST_CATEGORY_ID);
  });

  it('reports the category chosen in the rail to its owner', () => {
    // arrange
    const wrapper = mountComponent({ activeCategoryId: FIRST_CATEGORY_ID });

    // act
    wrapper.findComponent(CategoryRail).vm.$emit('categoryActivated', SECOND_CATEGORY_ID);

    // assert
    expect(wrapper.emitted('update:activeCategoryId')).to.deep.equal([[SECOND_CATEGORY_ID]]);
  });

  it('switches categories by itself when no owner holds the category', async () => {
    // arrange
    const wrapper = mountComponent();

    // act
    wrapper.findComponent(CategoryRail).vm.$emit('categoryActivated', SECOND_CATEGORY_ID);
    await wrapper.vm.$nextTick();

    // assert
    expect(getOpenCategoryId(wrapper)).to.equal(SECOND_CATEGORY_ID);
  });
});

function getOpenCategoryId(wrapper: ReturnType<typeof mountComponent>): string | undefined {
  return wrapper.findComponent(CategoryRail).props('activeCategoryId');
}

function mountComponent(props?: { readonly activeCategoryId: string | undefined }) {
  const collection = new CategoryCollectionStub().withActions(
    new CategoryStub(FIRST_CATEGORY_ID).withScript(new ScriptStub('first-script')),
    new CategoryStub(SECOND_CATEGORY_ID).withScript(new ScriptStub('second-script')),
  );
  const collectionState = new UseCollectionStateStub()
    .withState(new CategoryCollectionStateStub().withCollection(collection));
  const wrapper = shallowMount(TheSelectionExplorer, {
    props,
    global: {
      provide: {
        [InjectionKeys.useCollectionState.key]: () => collectionState.get(),
        [InjectionKeys.useUserSelectionState.key]: () => ({
          currentSelection: shallowRef(new UserSelectionStub()),
          modifyCurrentSelection: () => { /* not exercised */ },
        }),
      },
    },
  });
  expect(wrapper.findComponent(ScriptListPanel).exists()).to.equal(true);
  return wrapper;
}
