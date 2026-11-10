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
        ref="inputElement"
        v-model="searchQuery"
        type="search"
        class="search-term"
        :placeholder="searchPlaceholder"
        autocomplete="off"
        spellcheck="false"
        aria-keyshortcuts="/ Control+K Meta+K"
        @keydown.esc="clearAndLeave"
      >
      <kbd
        v-if="!searchQuery"
        class="search__shortcut"
        aria-hidden="true"
      >/</kbd>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, ref, watch, computed, shallowRef, onMounted, onUnmounted,
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

    const inputElement = shallowRef<HTMLInputElement>();

    const searchPlaceholder = computed<string>(() => {
      const { totalScripts } = currentState.value.collection;
      return `Search ${totalScripts} scripts`;
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

    function clearAndLeave() {
      searchQuery.value = '';
      inputElement.value?.blur();
    }

    /*
      Search is the fastest way through a thousand settings, so it is one key away from anywhere
      on the page: `/` as on most documentation sites, and Ctrl/Cmd+K as in most desktop apps.
      `/` is left alone while the visitor is typing somewhere else.
    */
    function onGlobalKeydown(event: KeyboardEvent) {
      const isCommandK = event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey);
      const isSlash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey;
      if (!isCommandK && !(isSlash && !isTypingTarget(event.target))) {
        return;
      }
      event.preventDefault();
      inputElement.value?.focus();
      inputElement.value?.select();
    }

    onMounted(() => document.addEventListener('keydown', onGlobalKeydown));
    onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown));

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
      inputElement,
      searchPlaceholder,
      searchQuery,
      clearAndLeave,
    };
  },
});

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable
    || target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement;
}

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

/*
  A flat well in the bar rather than another pane of glass: a neutral fill at rest, a bright lens
  with an accent halo once focused.
*/
.search {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  border-radius: 999px;
  background: var(--fill-track);
  transition:
    background-color $motion-duration-standard $motion-ease-standard,
    box-shadow $motion-duration-standard $motion-ease-standard;

  &:hover {
    background: var(--fill-hover);
  }

  &:focus-within {
    background: var(--lens);
    box-shadow: var(--lens-shadow), 0 0 0 3px var(--accent-soft);
  }
}

.search-term {
  width: 100%;
  min-width: 60px;
  height: 100%;
  padding: 0 40px 0 38px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: $font-size-absolute-normal;

  &::placeholder {
    color: var(--text-tertiary);
    opacity: 1;
  }

  &::-webkit-search-cancel-button {
    cursor: pointer;
  }

  /* Keyboard focus is carried by the halo on `.search`; a second ring inside the pill is noise. */
  &:focus-visible {
    outline: 0;
  }
}

.icon-wrapper {
  position: absolute;
  left: 14px;
  z-index: 1;
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  color: var(--text-tertiary);
  font-size: 14px;
  pointer-events: none;
  transition: color $motion-duration-fast $motion-ease-standard;

  .search:focus-within & {
    color: var(--accent-text);
  }
}

.search__shortcut {
  position: absolute;
  right: 12px;
  min-width: 22px;
  font-size: 12px;
  line-height: 16px;
  pointer-events: none;
}

/* Below 16px, iOS zooms the page into a focused field. */
@media (pointer: coarse) {
  .search-term {
    font-size: 16px;
  }

  .search__shortcut {
    display: none;
  }
}
</style>
