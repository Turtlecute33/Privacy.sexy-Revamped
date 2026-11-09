<template>
  <div class="scripts-view">
    <TheSelectionExplorer
      v-if="!currentFilter"
      v-model:active-category-id="activeCategoryId"
    />
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
import type { ExecutableId } from '@/domain/Executables/Identifiable';

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

    /*
      Held here rather than in the explorer, which is unmounted while search results are shown, so
      closing a search returns to the category the visitor had open instead of the first one.
    */
    const activeCategoryId = ref<ExecutableId | undefined>();
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
      activeCategoryId,
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
  height: 100%;
  flex: 1;
}

.search-no-matches {
  @include glass-surface($radius: 22px);
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 24px;
  color: var(--text-secondary);
  font-size: $font-size-absolute-normal;
  text-align: center;
  word-break: break-word;

  /* Unwrapped so the title, the hint and the button can stack in reading order. */
  &__header {
    display: contents;

    :deep(.flat-button) {
      order: 3;
      margin-top: 6px;
      background: var(--fill-track);
    }
  }

  &__title {
    order: 1;
    color: var(--text);
    font-family: $font-family-display;
    font-size: $font-size-absolute-x-large;
    font-weight: 650;
    letter-spacing: -0.02em;
  }

  > div:last-child {
    order: 2;
    max-width: 44ch;
  }

  a {
    color: var(--accent-text);
  }
}
</style>
