import { describe, it, expect } from 'vitest';
import { VueWrapper, shallowMount } from '@vue/test-utils';
import TheScriptsView from '@/presentation/components/Scripts/View/TheScriptsView.vue';
import TheSelectionExplorer from '@/presentation/components/Scripts/View/Selection/TheSelectionExplorer.vue';
import ScriptSearchResults from '@/presentation/components/Scripts/View/Selection/ScriptSearchResults.vue';
import FlatButton from '@/presentation/components/Shared/FlatButton.vue';
import { useCollectionState } from '@/presentation/components/Shared/Hooks/UseCollectionState';
import { UseCollectionStateStub } from '@tests/unit/shared/Stubs/UseCollectionStateStub';
import { InjectionKeys } from '@/presentation/injectionSymbols';
import { UseApplicationStub } from '@tests/unit/shared/Stubs/UseApplicationStub';
import { FilterResultStub } from '@tests/unit/shared/Stubs/FilterResultStub';
import type { FilterChangeDetails } from '@/application/Context/State/Filter/Event/FilterChangeDetails';
import { UseAutoUnsubscribedEventsStub } from '@tests/unit/shared/Stubs/UseAutoUnsubscribedEventsStub';
import { FilterChangeDetailsStub } from '@tests/unit/shared/Stubs/FilterChangeDetailsStub';
import { FilterContextStub } from '@tests/unit/shared/Stubs/FilterContextStub';
import type { FilterResult } from '@/application/Context/State/Filter/Result/FilterResult';
import type { Component } from 'vue';

const DOM_SELECTOR_NO_MATCHES = '.search-no-matches';

describe('TheScriptsView.vue', () => {
  describe('switching between browsing and search', () => {
    interface ViewSwitchTestScenario {
      readonly name: string;
      readonly changeEvents: readonly FilterChangeDetails[];
      readonly componentsToDisappear: readonly Component[];
      readonly expectedComponent?: Component;
      readonly setupFilter?: (filter: FilterContextStub) => FilterContextStub;
    }
    const testCases: readonly ViewSwitchTestScenario[] = [
      {
        name: 'browses categories without a filter',
        changeEvents: [],
        expectedComponent: TheSelectionExplorer,
        componentsToDisappear: [ScriptSearchResults],
      },
      {
        name: 'shows results for an initially applied filter',
        setupFilter: (filter: FilterContextStub) => filter
          .withCurrentFilter(
            new FilterResultStub().withQueryAndSomeMatches(),
          ),
        changeEvents: [],
        expectedComponent: ScriptSearchResults,
        componentsToDisappear: [TheSelectionExplorer],
      },
      {
        name: 'restores browsing after an initially applied filter is cleared',
        setupFilter: (filter: FilterContextStub) => filter
          .withCurrentFilter(
            new FilterResultStub().withQueryAndSomeMatches(),
          ),
        changeEvents: [
          FilterChangeDetailsStub.forClear(),
        ],
        expectedComponent: TheSelectionExplorer,
        componentsToDisappear: [ScriptSearchResults],
      },
      {
        name: 'shows results once a filter is applied',
        changeEvents: [
          FilterChangeDetailsStub.forApply(
            new FilterResultStub().withQueryAndSomeMatches(),
          ),
        ],
        expectedComponent: ScriptSearchResults,
        componentsToDisappear: [TheSelectionExplorer],
      },
      {
        name: 'restores browsing after the filter is cleared',
        changeEvents: [
          FilterChangeDetailsStub.forApply(
            new FilterResultStub().withQueryAndSomeMatches(),
          ),
          FilterChangeDetailsStub.forClear(),
        ],
        expectedComponent: TheSelectionExplorer,
        componentsToDisappear: [ScriptSearchResults],
      },
      {
        name: 'shows neither view when the filter has no matches',
        changeEvents: [
          FilterChangeDetailsStub.forApply(
            new FilterResultStub()
              .withQuery('non-empty query')
              .withEmptyMatches(),
          ),
        ],
        componentsToDisappear: [TheSelectionExplorer, ScriptSearchResults],
      },
    ];
    testCases.forEach(({
      name, changeEvents, expectedComponent: componentToAppear,
      componentsToDisappear, setupFilter,
    }) => {
      it(name, async () => {
        // arrange
        let filterStub = new FilterContextStub();
        if (setupFilter) {
          filterStub = setupFilter(filterStub);
        }
        const stateStub = new UseCollectionStateStub()
          .withFilter(filterStub);
        const wrapper = mountComponent({
          useCollectionState: stateStub.get(),
        });

        // act
        for (const changeEvent of changeEvents) {
          filterStub.notifyFilterChange(changeEvent);
          // eslint-disable-next-line no-await-in-loop
          await wrapper.vm.$nextTick();
        }

        // assert
        if (componentToAppear) {
          expect(wrapper.findComponent(componentToAppear).exists()).to.equal(true, wrapper.html());
        }
        expectComponentsToNotExist(wrapper, componentsToDisappear);
      });
    });
  });

  describe('clearing the search', () => {
    it('clears the filter when the search results request it', async () => {
      // arrange
      const filterStub = new FilterContextStub();
      const stateStub = new UseCollectionStateStub().withFilter(filterStub);
      const wrapper = mountComponent({
        useCollectionState: stateStub.get(),
      });
      filterStub.notifyFilterChange(FilterChangeDetailsStub.forApply(
        new FilterResultStub().withQueryAndSomeMatches(),
      ));
      await wrapper.vm.$nextTick();
      filterStub.callHistory.length = 0;

      // act
      wrapper.findComponent(ScriptSearchResults).vm.$emit('searchCleared');
      await wrapper.vm.$nextTick();

      // assert
      expect(filterStub.callHistory).to.have.lengthOf(1);
      expect(filterStub.callHistory.find((c) => c.methodName === 'clearFilter')).toBeDefined();
    });

    it('clears the filter from the empty result state', async () => {
      // arrange
      const filterStub = new FilterContextStub();
      const stateStub = new UseCollectionStateStub().withFilter(filterStub);
      const wrapper = mountComponent({
        useCollectionState: stateStub.get(),
      });
      filterStub.notifyFilterChange(FilterChangeDetailsStub.forApply(
        new FilterResultStub()
          .withQuery('non-empty query')
          .withEmptyMatches(),
      ));
      await wrapper.vm.$nextTick();
      filterStub.callHistory.length = 0;

      // act
      wrapper.findComponent(FlatButton).vm.$emit('click');
      await wrapper.vm.$nextTick();

      // assert
      expect(filterStub.callHistory).to.have.lengthOf(1);
      expect(filterStub.callHistory.find((c) => c.methodName === 'clearFilter')).toBeDefined();
    });
  });

  describe('no matches text', () => {
    interface NoMatchesTextTestCase {
      readonly name: string;
      readonly filter: FilterResult;
      readonly shouldNoMatchesExist: boolean;
    }
    const commonTestCases: readonly NoMatchesTextTestCase[] = [
      {
        name: 'shows text given no matches',
        filter: new FilterResultStub()
          .withQuery('non-empty query')
          .withEmptyMatches(),
        shouldNoMatchesExist: true,
      },
      {
        name: 'does not show text given some matches',
        filter: new FilterResultStub().withQueryAndSomeMatches(),
        shouldNoMatchesExist: false,
      },
    ];
    describe('initial state', () => {
      interface InitialStateTestCase extends Omit<NoMatchesTextTestCase, 'filter'> {
        readonly filter?: FilterResult;
      }
      const initialStateTestCases: readonly InitialStateTestCase[] = [
        ...commonTestCases,
        {
          name: 'does not show text given no filter',
          filter: undefined,
          shouldNoMatchesExist: false,
        },
      ];
      initialStateTestCases.forEach(({ name, filter, shouldNoMatchesExist }) => {
        it(name, () => {
          // arrange
          const expected = shouldNoMatchesExist;
          const stateStub = new UseCollectionStateStub()
            .withFilterResult(filter);

          // act
          const wrapper = mountComponent({
            useCollectionState: stateStub.get(),
          });

          // expect
          const actual = wrapper.find(DOM_SELECTOR_NO_MATCHES).exists();
          expect(actual).to.equal(expected);
        });
      });
    });
    describe('on state change', () => {
      commonTestCases.forEach(({ name, filter, shouldNoMatchesExist }) => {
        it(name, async () => {
          // arrange
          const expected = shouldNoMatchesExist;
          const filterStub = new FilterContextStub();
          const stateStub = new UseCollectionStateStub()
            .withFilter(filterStub);
          const wrapper = mountComponent({
            useCollectionState: stateStub.get(),
          });

          // act
          filterStub.notifyFilterChange(FilterChangeDetailsStub.forApply(
            filter,
          ));
          await wrapper.vm.$nextTick();

          // expect
          const actual = wrapper.find(DOM_SELECTOR_NO_MATCHES).exists();
          expect(actual).to.equal(expected);
        });
      });
      it('shows no text if filter is removed after matches', async () => {
        // arrange
        const filter = new FilterContextStub();
        const stub = new UseCollectionStateStub()
          .withFilter(filter);
        const wrapper = mountComponent({
          useCollectionState: stub.get(),
        });

        // act
        filter.notifyFilterChange(FilterChangeDetailsStub.forApply(
          new FilterResultStub().withSomeMatches(),
        ));
        filter.notifyFilterChange(FilterChangeDetailsStub.forClear());
        await wrapper.vm.$nextTick();

        // expect
        expect(wrapper.find(DOM_SELECTOR_NO_MATCHES).exists()).to.equal(false);
      });
    });
  });
});

function expectComponentsToNotExist(wrapper: VueWrapper, components: readonly Component[]) {
  const existingUnexpectedComponents = components
    .map((component) => wrapper.findComponent(component))
    .filter((component) => component.exists());
  expect(existingUnexpectedComponents).to.have.lengthOf(0);
}

function mountComponent(options?: {
  readonly useCollectionState?: ReturnType<typeof useCollectionState>,
}) {
  return shallowMount(TheScriptsView, {
    global: {
      provide: {
        [InjectionKeys.useCollectionState.key]:
          () => options?.useCollectionState ?? new UseCollectionStateStub().get(),
        [InjectionKeys.useApplication.key]:
          new UseApplicationStub().get(),
        [InjectionKeys.useAutoUnsubscribedEvents.key]:
          () => new UseAutoUnsubscribedEventsStub().get(),
      },
    },
  });
}
