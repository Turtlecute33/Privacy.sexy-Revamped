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
          :class="{ 'is-active': item.categoryId === activeCategoryId }"
          :aria-current="item.categoryId === activeCategoryId ? 'true' : undefined"
          @click="$emit('categoryActivated', item.categoryId)"
        >
          <span class="rail__item__name">{{ item.name }}</span>
          <span class="rail__item__meta">
            <span class="rail__item__count">
              {{ selectedCounts.get(item.categoryId) ?? 0 }}<span
                class="rail__item__count__separator"
              >/</span>{{ item.scriptIds.length }}
            </span>
            <span
              class="rail__item__gauge"
              aria-hidden="true"
            >
              <span
                class="rail__item__gauge__fill"
                :style="{ width: `${getSelectedRatioInPercent(item)}%` }"
              />
            </span>
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

    function getSelectedRatioInPercent(item: CategoryOutlineItem): number {
      if (item.scriptIds.length === 0) {
        return 0;
      }
      const selected = selectedCounts.value.get(item.categoryId) ?? 0;
      return (selected / item.scriptIds.length) * 100;
    }

    return {
      selectedCounts,
      getSelectedRatioInPercent,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 10px 16px;
  overflow-y: auto;
  border-right: 1px solid rgba($color-on-primary, 0.08);
}

.rail__caption {
  margin: 0 0 8px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  /*
   * 11px bold counts as normal-sized text for WCAG, so this needs 4.5:1 against the rail's
   * $color-primary-darkest panel. 0.38 measured 3.45:1 and failed the audit; 0.55 gives 5.7:1
   * while staying dimmer than the item labels above it, which sit at 0.72.
   */
  color: rgba($color-on-primary, 0.55);
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
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 9px 10px;
  border-radius: 10px;
  text-align: left;
  color: rgba($color-on-primary, 0.72);
  transition:
    color $motion-duration-fast $motion-ease-standard,
    background-color $motion-duration-fast $motion-ease-standard;

  @include hover-or-touch {
    background: rgba($color-on-primary, 0.06);
    color: $color-on-primary;
  }

  &:focus-visible {
    outline: 3px solid $color-secondary;
    outline-offset: -1px;
  }

  /*
    The open category is marked by the accent-tinted surface itself rather than a
    separate marker, so the rail stays flat. The hairline ring keeps it distinguishable
    from the neutral hover surface even when the pointer rests on another item.
  */
  &.is-active {
    background: rgba($color-secondary, 0.13);
    color: $color-on-primary;
    box-shadow: inset 0 0 0 1px rgba($color-secondary, 0.26);

    .rail__item__count {
      color: rgba($color-on-primary, 0.75);
    }

    @include hover-or-touch {
      background: rgba($color-secondary, 0.19);
    }
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__count {
    flex: 0 0 auto;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: rgba($color-on-primary, 0.5);

    &__separator {
      padding: 0 1px;
      opacity: 0.55;
    }
  }

  &__gauge {
    flex: 1;
    height: 3px;
    min-width: 24px;
    border-radius: 3px;
    background: rgba($color-on-primary, 0.12);
    overflow: hidden;

    &__fill {
      display: block;
      height: 100%;
      border-radius: 3px;
      background: $color-secondary;
      transition: width $motion-duration-standard $motion-ease-out;
    }
  }
}

@media (pointer: coarse) {
  .rail__item {
    padding-top: 11px;
    padding-bottom: 11px;
  }
}

/*
  Below the breakpoint the rail turns into a horizontally scrollable strip above the
  script list, so the list keeps the full width on phones.
*/
@media screen and (max-width: $media-screen-medium-width) {
  .rail {
    padding: 10px 12px;
    border-right: 0;
    border-bottom: 1px solid rgba($color-on-primary, 0.08);
    overflow-x: auto;
    overflow-y: hidden;
  }

  .rail__caption {
    display: none;
  }

  .rail__list {
    flex-direction: row;
    gap: 6px;
  }

  .rail__item {
    width: auto;
    min-width: 132px;
    padding: 8px 12px;
    border: 1px solid rgba($color-on-primary, 0.1);

    // The chip already has a real border here, so the ring would only double it up.
    &.is-active {
      box-shadow: none;
      border-color: rgba($color-secondary, 0.5);
    }

    &__name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      overflow-wrap: normal;
    }
  }
}
</style>
