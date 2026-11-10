<template>
  <nav class="rail" aria-label="Script categories">
    <p class="rail__caption">
      Categories
    </p>
    <ul class="rail__list">
      <li
        v-for="item of items"
        :key="item.categoryId"
      >
        <button
          type="button"
          class="rail__item"
          :class="{
            'is-active': item.categoryId === activeCategoryId,
            'has-selection': (selectedCounts.get(item.categoryId) ?? 0) > 0,
          }"
          :aria-current="item.categoryId === activeCategoryId ? 'true' : undefined"
          @click="$emit('categoryActivated', item.categoryId)"
        >
          <span class="rail__item__name">{{ item.name }}</span>
          <span class="rail__item__count">
            <span class="rail__item__count__selected">{{ selectedCounts.get(item.categoryId) ?? 0 }}</span><span
              class="rail__item__count__separator"
            >/</span>{{ item.scriptIds.length }}
          </span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import type { CategoryOutlineItem } from './Model/CategoryOutline';

export default defineComponent({
  props: {
    items: {
      type: Array as PropType<ReadonlyArray<CategoryOutlineItem>>,
      required: true,
    },
    selectedScriptIds: {
      type: Object as PropType<ReadonlySet<ExecutableId>>,
      required: true,
    },
    activeCategoryId: {
      type: String as PropType<ExecutableId>,
      default: undefined,
    },
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    categoryActivated: (categoryId: ExecutableId) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props) {
    const selectedCounts = computed<ReadonlyMap<ExecutableId, number>>(() => new Map(
      props.items.map((item) => [
        item.categoryId,
        item.scriptIds.filter((scriptId) => props.selectedScriptIds.has(scriptId)).length,
      ]),
    ));

    return {
      selectedCounts,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.rail {
  @include glass-surface($radius: 22px);
  @include glass-scrollbar;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 10px;
  overflow-y: auto;
}

.rail__caption {
  margin: 0 0 8px;
  padding: 0 12px;
  color: var(--text-tertiary);
  font-size: $font-size-absolute-x-small;
  font-weight: 600;
}

.rail__list {
  @include reset-ul;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail__item {
  @include reset-button;
  @include clickable;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 38px;
  padding: 8px 12px;
  border-radius: 12px;
  text-align: left;
  color: var(--text-secondary);
  transition:
    color $motion-duration-fast $motion-ease-standard,
    background-color $motion-duration-fast $motion-ease-standard,
    box-shadow $motion-duration-fast $motion-ease-standard;

  @include hover-or-touch {
    background: var(--fill-hover);
    color: var(--text);
  }

  @include focus-ring($offset: -2px);

  /* The open category is lifted onto the same bright lens as the pressed segment in the top bar. */
  &.is-active {
    background: var(--lens);
    box-shadow: var(--lens-shadow);
    color: var(--text);

    @include hover-or-touch {
      background: var(--lens);
    }
  }

  &__name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: $font-size-absolute-small;
    font-weight: 500;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  &.is-active &__name {
    font-weight: 600;
  }

  &__count {
    flex: 0 0 auto;
    color: var(--text-tertiary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;

    &__separator {
      padding: 0 1px;
      opacity: 0.6;
    }
  }

  &.has-selection &__count__selected {
    color: var(--accent-text);
    font-weight: 700;
  }
}

@media (pointer: coarse) {
  .rail__item {
    min-height: 44px;
  }
}

/*
  Below the breakpoint the rail turns into a horizontally scrollable strip of chips above the
  script list, so the list keeps the full width on phones.
*/
@media screen and (max-width: $media-screen-medium-width) {
  .rail {
    padding: 8px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .rail__caption {
    display: none;
  }

  .rail__list {
    flex-direction: row;
    gap: 4px;
  }

  .rail__item {
    width: auto;
    max-width: 220px;
    border-radius: 999px;

    &__name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      overflow-wrap: normal;
    }
  }
}
</style>
