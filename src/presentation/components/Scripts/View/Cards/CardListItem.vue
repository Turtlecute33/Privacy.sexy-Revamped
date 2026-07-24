<template>
  <div
    ref="cardElement"
    class="card"
    :class="{
      'is-inactive': activeCategoryId && activeCategoryId !== categoryId,
      'is-expanded': isExpanded,
    }"
  >
    <button
      type="button"
      class="card__inner"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <span
        class="card__inner__title"
      >
        {{ cardTitle || 'Untitled category' }}
      </span>
      <CardSelectionIndicator
        class="card__inner__selection_indicator"
        :category-id="categoryId"
      />
    </button>
    <CardExpandTransition>
      <div v-show="isExpanded">
        <CardExpansionArrow />
        <div
          class="card__expander"
          @click.stop
        >
          <div class="card__expander__close-button">
            <FlatButton
              icon="xmark"
              @click="collapse()"
            />
          </div>
          <div class="card__expander__content">
            <ScriptsTree
              :category-id="categoryId"
              :has-top-padding="false"
            />
          </div>
        </div>
      </div>
    </CardExpandTransition>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, computed, shallowRef, nextTick,
  type PropType,
} from 'vue';
import FlatButton from '@/presentation/components/Shared/FlatButton.vue';
import { injectKey } from '@/presentation/injectionSymbols';
import ScriptsTree from '@/presentation/components/Scripts/View/Tree/ScriptsTree.vue';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import CardSelectionIndicator from './CardSelectionIndicator.vue';
import CardExpandTransition from './CardExpandTransition.vue';
import CardExpansionArrow from './CardExpansionArrow.vue';

export default defineComponent({
  components: {
    ScriptsTree,
    CardSelectionIndicator,
    FlatButton,
    CardExpandTransition,
    CardExpansionArrow,
  },
  props: {
    categoryId: {
      type: String as PropType<ExecutableId>,
      required: true,
    },
    activeCategoryId: {
      type: String as PropType<ExecutableId>,
      default: undefined,
    },
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    cardExpansionChanged: (isExpanded: boolean) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props, { emit }) {
    const { currentState } = injectKey((keys) => keys.useCollectionState);

    const isExpanded = computed({
      get: () => {
        return props.activeCategoryId === props.categoryId;
      },
      set: (newValue) => {
        if (newValue) {
          scrollToCard();
        }
        emit('cardExpansionChanged', newValue);
      },
    });

    const cardElement = shallowRef<HTMLElement>();

    const cardTitle = computed<string>(() => {
      const category = currentState.value.collection.getCategory(props.categoryId);
      return category.name;
    });

    function collapse() {
      isExpanded.value = false;
    }

    async function scrollToCard() {
      const card = cardElement.value;
      if (!card) {
        throw new Error('Card is not found');
      }
      await nextTick();
      window.requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        card.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'nearest',
        });
      });
    }

    return {
      cardTitle,
      isExpanded,
      cardElement,
      collapse,
    };
  },
});

</script>

<style scoped lang="scss">
@use "sass:color";
@use "@/presentation/assets/styles/main" as *;
@use "./card-gap" as *;

$card-inner-padding     : 18px;
$expanded-margin-top    : 16px;
$card-horizontal-gap    : $card-gap;

.card {
  .card__inner {
    @include reset-button;
    overflow: hidden;
    padding: 16px $card-inner-padding;
    position: relative;
    @include clickable;
    background-color: $color-primary;
    color: $color-on-primary;
    height: 100%;
    min-height: 96px;
    width: 100%;
    border: 1px solid transparent;
    border-radius: 12px;
    text-align: center;
    transition:
      background-color $motion-duration-fast $motion-ease-standard,
      border-color $motion-duration-fast $motion-ease-standard,
      transform $motion-duration-standard $motion-ease-out;

    display: grid;
    place-items: center;

    @include hover-or-touch {
      background-color: color.adjust($color-primary, $lightness: 6%);
      border-color: rgba($color-secondary, 0.55);
      transform: translateY(-1px);
    }

    .card__inner__title {
      position: relative;
      z-index: 1;
      display: block;
      width: 100%;
      padding: 0 24px;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: -0.01em;
      text-align: center;
      text-wrap: balance;
      overflow-wrap: anywhere;
    }

    .card__inner__selection_indicator {
      position: absolute;
      top: 13px;
      right: 13px;
      z-index: 1;
      color: $color-secondary-light;
    }

  }

  .card__expander {
    position: relative;
    min-height: 200px;
    background-color: $color-primary-darker;
    color: $color-on-primary;
    border: 1px solid rgba($color-on-primary, 0.08);
    border-radius: 15px;
    overflow: hidden;

    display: flex;
    align-items: center;
    flex-direction: column;

    .card__expander__content {
      display: flex;
      flex: 1;
      justify-content: center;
      word-break: break-word;
      max-width: 100%; // Prevents horizontal expansion of inner content (e.g., when a code block is shown)
      width: 100%; // Expands the container to fill available horizontal space, enabling alignment of child items.
    }

    .card__expander__close-button {
      font-size: $font-size-absolute-large;
      align-self: flex-end;
      margin: 8px 8px 0 0;
      @include clickable;
      color: $color-primary-light;
      @include hover-or-touch {
        color: $color-secondary;
      }
    }
  }

  &.is-expanded {
    .card__inner {
      height: auto;
      background-color: $color-secondary;
      color: $color-on-secondary;
      border-color: $color-secondary;
      transform: none;
    }

    .card__inner__selection_indicator {
      color: $color-on-secondary;
    }

    .card__expander {
      margin-top: $expanded-margin-top;
    }
  }

  &.is-inactive {
    .card__inner {
      pointer-events: none;
      height: auto;
      background-color: $color-primary-darker;
      color: rgba($color-on-primary, 0.55);
      border-color: transparent;
    }

    .card__inner__selection_indicator {
      opacity: 0.45;
    }
  }
}
@mixin adaptive-card($cards-in-row) {
  &.card {
    $total-times-gap-is-used-in-row: $cards-in-row - 1;
    $total-gap-width-in-row: $total-times-gap-is-used-in-row * $card-horizontal-gap;
    $available-row-width-for-cards: calc(100% - #{$total-gap-width-in-row});
    $available-width-per-card: calc(#{$available-row-width-for-cards} / #{$cards-in-row});
    width:$available-width-per-card;
    .card__expander {
      $all-cards-width: 100% * $cards-in-row;
      $additional-padding-width: $card-horizontal-gap * ($cards-in-row - 1);
      width: calc(#{$all-cards-width} + #{$additional-padding-width});
    }
    @for $nth-card from 2 through $cards-in-row { // From second card to rest
      &:nth-of-type(#{$cards-in-row}n+#{$nth-card}) {
        .card__expander {
          $card-left: -100% * ($nth-card - 1);
          $additional-space: $card-horizontal-gap * ($nth-card - 1);
          margin-left: calc(#{$card-left} - #{$additional-space});
        }
      }
    }
    // Ensure new line after last row
    $card-after-last: $cards-in-row + 1;
    &:nth-of-type(#{$cards-in-row}n+#{$card-after-last}) {
      clear: left;
    }
  }
}

.big-screen     {   @include adaptive-card(3);  }
.medium-screen  {   @include adaptive-card(2);  }
.small-screen   {   @include adaptive-card(1);  }

@media screen and (max-width: $media-screen-medium-width) {
  .card {
    .card__expander {
      min-height: 160px;
    }
  }
}
</style>
