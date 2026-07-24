<template>
  <span
    class="checkbox"
    :class="{
      'is-checked': checked,
      'is-indeterminate': !checked && indeterminate,
    }"
  >
    <input
      :id="inputId"
      ref="inputElement"
      class="checkbox__input"
      type="checkbox"
      :checked="checked"
      :aria-label="accessibleLabel"
      @change="$emit('change', ($event.target as HTMLInputElement).checked)"
    >
    <span class="checkbox__box" aria-hidden="true">
      <svg class="checkbox__mark" viewBox="0 0 16 16">
        <path v-if="checked" d="m3 8.4 3.1 3.1L13 4.6" />
        <path v-else-if="indeterminate" d="M4 8h8" />
      </svg>
    </span>
  </span>
</template>

<script lang="ts">
import {
  defineComponent, onMounted, shallowRef, watch,
} from 'vue';

export default defineComponent({
  props: {
    checked: {
      type: Boolean,
      default: false,
    },
    /**
     * Rendered as a dash and reported to assistive technology as "mixed".
     * Ignored while {@link checked} is set, since a box cannot be both.
     */
    indeterminate: {
      type: Boolean,
      default: false,
    },
    accessibleLabel: {
      type: String,
      required: true,
    },
    /**
     * Identifier of the underlying input, so an outer `<label>` can point at it.
     */
    inputId: {
      type: String,
      required: true,
    },
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    change: (isChecked: boolean) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props) {
    const inputElement = shallowRef<HTMLInputElement>();

    /*
      `indeterminate` is a DOM property rather than an attribute, so it cannot be bound
      in the template. Keeping it in sync is what makes screen readers announce "mixed".
    */
    function syncIndeterminateProperty(): void {
      const input = inputElement.value;
      if (!input) {
        return;
      }
      input.indeterminate = !props.checked && props.indeterminate;
    }

    onMounted(syncIndeterminateProperty);
    watch(() => [props.checked, props.indeterminate], syncIndeterminateProperty);

    return {
      inputElement,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

$size: 18px;

.checkbox {
  position: relative;
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: $size;
  height: $size;

  &__input {
    position: absolute;
    /*
      The input stays on top of the box and is stretched past it, so the whole 44px
      interaction area belongs to it. Hiding it with `opacity` instead of `appearance`
      keeps native keyboard behaviour and the `indeterminate` announcement intact.
    */
    inset: -8px;
    width: auto;
    height: auto;
    margin: 0;
    opacity: 0;
    @include clickable;
  }

  &__box {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    border: 1px solid rgba($color-on-primary, 0.35);
    border-radius: 5px;
    background: rgba($color-on-primary, 0.05);
    transition:
      background-color $motion-duration-fast $motion-ease-standard,
      border-color $motion-duration-fast $motion-ease-standard;
  }

  &__mark {
    width: 12px;
    height: 12px;
    overflow: visible;
    fill: none;
    stroke: $color-on-secondary;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2.25;
  }

  &.is-checked &__box {
    border-color: $color-secondary;
    background: $color-secondary;
  }

  &.is-indeterminate &__box {
    border-color: rgba($color-secondary, 0.7);
    background: rgba($color-secondary, 0.2);
  }

  &.is-indeterminate &__mark {
    stroke: $color-secondary-light;
  }

  .checkbox__input:focus-visible + &__box {
    outline: 3px solid $color-secondary;
    outline-offset: 2px;
  }

  @include hover-or-touch($selector-suffix: '+ .checkbox__box', $selector-prefix: '.checkbox__input') {
    border-color: rgba($color-secondary, 0.8);
  }
}
</style>
