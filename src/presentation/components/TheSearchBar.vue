<template>
  <div class="search-field">
    <!-- Kept for screen readers (labels the search input) but hidden visually. -->
    <label for="script-search" class="visually-hidden">Search privacy tweaks</label>
    <div class="search">
      <div class="icon-wrapper" aria-hidden="true">
        <AppIcon icon="magnifying-glass" />
      </div>
      <input
        id="script-search"
        v-model="searchQuery"
        type="search"
        class="search-term"
        :placeholder="searchPlaceholder"
        autocomplete="off"
      >
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, ref, watch, computed,
} from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';
import { batchedDebounce } from '@/application/Common/Timing/BatchedDebounce';
import type { ReadonlyFilterContext } from '@/application/Context/State/Filter/FilterContext';
import type { FilterResult } from '@/application/Context/State/Filter/Result/FilterResult';
import type { IEventSubscription } from '@/infrastructure/Events/IEventSource';

/*
  `LinearFilterStrategy` reads the code of every script whose name misses the query, and script
  code compiles on first read (see `ScriptFactory.ts`), so a single keystroke can force the
  compilation of everything the background warm-up has not reached yet. Running that once per
  settled query instead of once per keypress keeps the worst case to one scan, and gives the
  warm-up the pause in between to shrink it.

  Waiting is only ever an input latency trade, never a results one: the query that finally runs is
  the full one the user typed, matched against exactly the same scripts as before.
*/
const SearchDebounceInMs = 250;

export default defineComponent({
  components: { AppIcon },
  setup() {
    const {
      modifyCurrentState, onStateChange, currentState,
    } = injectKey((keys) => keys.useCollectionState);
    const { events } = injectKey((keys) => keys.useAutoUnsubscribedEvents);

    const searchPlaceholder = computed<string>(() => {
      const { totalScripts } = currentState.value.collection;
      return `Search in ${totalScripts} scripts`;
    });

    const searchQuery = ref<string | undefined>();

    const queueFilterUpdate = batchedDebounce<string | undefined>(
      (queuedFilters) => updateFilter(queuedFilters[queuedFilters.length - 1]),
      SearchDebounceInMs,
    );

    watch(searchQuery, (newFilter) => queueFilterUpdate(newFilter));

    function updateFilter(newFilter: string | undefined) {
      modifyCurrentState((state) => {
        const { filter } = state;
        if (!newFilter) {
          filter.clearFilter();
        } else {
          filter.applyFilter(newFilter);
        }
      });
    }

    onStateChange((newState) => {
      updateFromInitialFilter(newState.filter.currentFilter);
      events.unsubscribeAllAndRegister([
        subscribeToFilterChanges(newState.filter),
      ]);
    }, { immediate: true });

    function updateFromInitialFilter(filter?: FilterResult) {
      searchQuery.value = filter?.query;
    }

    function subscribeToFilterChanges(
      filter: ReadonlyFilterContext,
    ): IEventSubscription {
      return filter.filterChanged.on((event) => {
        event.visit({
          onApply: (result) => {
            searchQuery.value = result.query;
          },
          onClear: () => {
            searchQuery.value = '';
          },
        });
      });
    }

    return {
      searchPlaceholder,
      searchQuery,
    };
  },
});

</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  border: 1px solid $color-border;
  border-radius: 12px;
  background: $color-surface-elevated;
  box-shadow: 0 8px 24px rgba($color-primary-darkest, 0.055);
  transition:
    border-color $motion-duration-fast $motion-ease-standard,
    box-shadow $motion-duration-standard $motion-ease-standard;

  &:focus-within {
    border-color: rgba($color-primary, 0.65);
    box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
  }
}

.search-term {
  width: 100%;
  min-width: 60px;
  min-height: 42px;
  padding: 0 18px 0 54px;
  border: 0;
  outline: 0;
  background: transparent;
  color: $color-primary-darkest;
  font-size: $font-size-absolute-normal;

  &::placeholder {
    color: $color-on-surface-muted;
    opacity: 1;
  }

  &::-webkit-search-cancel-button {
    cursor: pointer;
  }
}

.icon-wrapper {
  position: absolute;
  left: 18px;
  z-index: 1;
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: $color-primary;
  font-size: $font-size-absolute-normal;
  pointer-events: none;
}
</style>
