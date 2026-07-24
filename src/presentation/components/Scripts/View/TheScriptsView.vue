<template>
  <div class="scripts-view">
    <TheSelectionExplorer v-if="!currentFilter" />
    <ScriptSearchResults
      v-else-if="searchHasMatches"
      :filter="currentFilter"
      :query-label="trimmedSearchQuery"
      @search-cleared="clearSearchQuery()"
    />
    <div v-else class="search-no-matches">
      <div class="search-no-matches__header">
        <div class="search-no-matches__title">
          No matches for "{{ trimmedSearchQuery }}"
        </div>
        <FlatButton
          icon="xmark"
          label="Close search"
          @click="clearSearchQuery()"
        />
      </div>
      <div>
        Try a broader term, or help us extend the scripts
        <a :href="repositoryUrl" class="child github" target="_blank" rel="noopener noreferrer">on GitHub</a>.
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, ref, computed,
} from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import TheSelectionExplorer from '@/presentation/components/Scripts/View/Selection/TheSelectionExplorer.vue';
import ScriptSearchResults from '@/presentation/components/Scripts/View/Selection/ScriptSearchResults.vue';
import type { ReadonlyFilterContext } from '@/application/Context/State/Filter/FilterContext';
import type { FilterResult } from '@/application/Context/State/Filter/Result/FilterResult';
import FlatButton from '@/presentation/components/Shared/FlatButton.vue';

export default defineComponent({
  components: {
    TheSelectionExplorer,
    ScriptSearchResults,
    FlatButton,
  },
  setup() {
    const { modifyCurrentState, onStateChange } = injectKey((keys) => keys.useCollectionState);
    const { events } = injectKey((keys) => keys.useAutoUnsubscribedEvents);
    const { projectDetails } = injectKey((keys) => keys.useApplication);

    const repositoryUrl = computed<string>(() => projectDetails.repositoryWebUrl);
    const currentFilter = ref<FilterResult | undefined>();
    const searchHasMatches = computed(() => currentFilter.value?.hasAnyMatches() ?? false);
    const trimmedSearchQuery = computed(() => {
      const query = currentFilter.value?.query;
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
      currentFilter.value = filter?.query ? filter : undefined;
    }

    function subscribeToFilterChanges(filter: ReadonlyFilterContext) {
      return filter.filterChanged.on((event) => {
        event.visit({
          onApply: (newFilter) => {
            currentFilter.value = newFilter;
          },
          onClear: () => {
            currentFilter.value = undefined;
          },
        });
      });
    }

    return {
      repositoryUrl,
      trimmedSearchQuery,
      currentFilter,
      searchHasMatches,
      clearSearchQuery,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.scripts-view {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  flex: 1;
  background: $color-scripts-bg;
}

.search-no-matches {
  display: flex;
  flex-direction: column;
  gap: $spacing-relative-small;
  padding: 18px 16px 36px;
  color: $color-on-primary;
  font-size: $font-size-absolute-normal;
  word-break: break-word;

  &__header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__title {
    font-size: $font-size-absolute-large;
    font-weight: 700;
  }

  a {
    color: $color-secondary;
  }
}
</style>
