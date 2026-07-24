<template>
  <div class="selection-indicator">
    <Transition name="selection-indicator">
      <svg
        v-if="selectionState"
        class="selection-indicator__mark"
        :class="`selection-indicator__mark--${selectionState}`"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path d="m2.5 8.2 3.2 3.2 7.8-8" />
      </svg>
    </Transition>
    <span v-if="selectionState" class="visually-hidden">
      {{ selectionLabel }}
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import type { Category } from '@/domain/Executables/Category/Category';
import type { CategoryCollection } from '@/domain/Collection/CategoryCollection';
import type { ExecutableId } from '@/domain/Executables/Identifiable';

export default defineComponent({
  props: {
    categoryId: {
      type: String as PropType<ExecutableId>,
      required: true,
    },
  },
  setup(props) {
    const { currentState } = injectKey((keys) => keys.useCollectionState);
    const { currentSelection } = injectKey((keys) => keys.useUserSelectionState);
    const currentCollection = computed<CategoryCollection>(() => currentState.value.collection);

    const currentCategory = computed<Category>(
      () => currentCollection.value.getCategory(props.categoryId),
    );

    const isAnyChildSelected = computed<boolean>(
      () => currentSelection.value.categories.isAnyScriptSelected(currentCategory.value),
    );

    const areAllChildrenSelected = computed<boolean>(
      () => currentSelection.value.categories.areAllScriptsSelected(currentCategory.value),
    );

    const selectionState = computed<'all' | 'partial' | undefined>(() => {
      if (areAllChildrenSelected.value) {
        return 'all';
      }
      return isAnyChildSelected.value ? 'partial' : undefined;
    });

    const selectionLabel = computed(() => (
      selectionState.value === 'all' ? 'All selected' : 'Some selected'
    ));

    return {
      selectionState,
      selectionLabel,
    };
  },
});

</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.selection-indicator {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  pointer-events: none;

  &__mark {
    width: 14px;
    height: 14px;
    overflow: visible;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;

    &--partial {
      opacity: 0.72;
    }
  }
}

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

.selection-indicator-enter-active,
.selection-indicator-leave-active {
  transition:
    opacity $motion-duration-fast $motion-ease-standard,
    transform $motion-duration-standard $motion-ease-out;
}

.selection-indicator-enter-from,
.selection-indicator-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
