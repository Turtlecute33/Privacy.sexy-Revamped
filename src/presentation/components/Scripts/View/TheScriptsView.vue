<template>
  <div class="scripts-view">
    <template v-if="!isSearching">
      <template v-if="currentView === ViewType.Cards">
        <CardList />
      </template>
      <template v-else-if="currentView === ViewType.Tree">
        <ScriptsTree />
      </template>
    </template>
    <template v-else>
      <!-- Searching -->
      <div class="search">
        <div class="search__query">
          <div>Searching for "{{ trimmedSearchQuery }}"</div>
          <div
            class="search__query__close-button"
            @click="clearSearchQuery()"
          >
            <FlatButton icon="xmark" />
          </div>
        </div>
        <div v-if="!searchHasMatches" class="search-no-matches">
          <div>No matches for "{{ trimmedSearchQuery }}"</div>
          <div>
            Try a broader term, or help us extend the scripts
            <a :href="repositoryUrl" class="child github" target="_blank" rel="noopener noreferrer">on GitHub</a>.
          </div>
        </div>
      </div>
      <div v-if="searchHasMatches">
        <ScriptsTree :has-top-padding="false" />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, type PropType, ref, computed,
} from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import ScriptsTree from '@/presentation/components/Scripts/View/Tree/ScriptsTree.vue';
import CardList from '@/presentation/components/Scripts/View/Cards/CardList.vue';
import { ViewType } from '@/presentation/components/Scripts/Menu/View/ViewType';
import type { ReadonlyFilterContext } from '@/application/Context/State/Filter/FilterContext';
import type { FilterResult } from '@/application/Context/State/Filter/Result/FilterResult';
import FlatButton from '@/presentation/components/Shared/FlatButton.vue';

export default defineComponent({
  components: {
    ScriptsTree,
    CardList,
    FlatButton,
  },
  props: {
    currentView: {
      type: Number as PropType<ViewType>,
      required: true,
    },
  },
  setup() {
    const { modifyCurrentState, onStateChange } = injectKey((keys) => keys.useCollectionState);
    const { events } = injectKey((keys) => keys.useAutoUnsubscribedEvents);
    const { projectDetails } = injectKey((keys) => keys.useApplication);

    const repositoryUrl = computed<string>(() => projectDetails.repositoryWebUrl);
    const searchQuery = ref<string | undefined>();
    const isSearching = computed(() => Boolean(searchQuery.value));
    const searchHasMatches = ref(false);
    const trimmedSearchQuery = computed(() => {
      const query = searchQuery.value;
      if (!query) {
        return '';
      }
      const threshold = 30;
      if (query.length <= threshold - 3) {
        return query;
      }
      return `${query.substring(0, threshold)}...`;
    });

    onStateChange((newState) => {
      updateFromInitialFilter(newState.filter.currentFilter);
      events.unsubscribeAllAndRegister([
        subscribeToFilterChanges(newState.filter),
      ]);
    }, { immediate: true });

    function clearSearchQuery() {
      modifyCurrentState((state) => {
        const { filter } = state;
        filter.clearFilter();
      });
    }

    function updateFromInitialFilter(filter?: FilterResult) {
      searchQuery.value = filter?.query;
      searchHasMatches.value = filter?.hasAnyMatches() ?? false;
    }

    function subscribeToFilterChanges(filter: ReadonlyFilterContext) {
      return filter.filterChanged.on((event) => {
        event.visit({
          onApply: (newFilter) => {
            searchQuery.value = newFilter.query;
            searchHasMatches.value = newFilter.hasAnyMatches();
          },
          onClear: () => {
            searchQuery.value = undefined;
          },
        });
      });
    }

    return {
      repositoryUrl,
      trimmedSearchQuery,
      isSearching,
      searchHasMatches,
      clearSearchQuery,
      ViewType,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.scripts-view {
  min-width: 0;
  overflow: visible;
}

.search {
  display: flex;
  flex-direction: column;
  background-color: $color-scripts-bg;
  padding: 18px 22px;

  .search__query {
    display: flex;
    justify-content: flex-start;
    flex-direction: row;
    align-items: center;
    color: $color-primary-light;

    .search__query__close-button {
      font-size: $font-size-absolute-large;
      margin-left: $spacing-relative-x-small;
    }
  }
  .search-no-matches {
    display:flex;
    flex-direction: column;
    word-break:break-word;
    color: $color-on-primary;
    font-size: $font-size-absolute-normal;
    padding: 36px 16px;
    text-align: left;
    gap: $spacing-relative-small;

    > :first-child {
      font-size: $font-size-absolute-large;
      font-weight: 700;
    }

    a {
      color: $color-secondary;
    }
  }
}
</style>
