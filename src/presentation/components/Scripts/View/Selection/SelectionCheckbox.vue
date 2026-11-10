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

$size: 20px;

/*
  A round selection mark, as native lists use for picking items: an empty ring at rest, a filled
  accent disc with a check once chosen, a tinted disc with a dash when a group is partly chosen.
*/
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
    border-radius: 50%;
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--control-edge);
    transition:
      background-color $motion-duration-fast $motion-ease-standard,
      box-shadow $motion-duration-fast $motion-ease-standard,
      transform $motion-duration-standard $motion-ease-out;
  }

  &__mark {
    width: 12px;
    height: 12px;
    overflow: visible;
    fill: none;
    stroke: var(--on-accent);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2.4;
  }

  &.is-checked &__box {
    background: var(--accent);
    box-shadow: none;
  }

  &.is-indeterminate &__box {
    background: var(--accent-soft);
    box-shadow: inset 0 0 0 1.5px var(--accent);
  }

  &.is-indeterminate &__mark {
    stroke: var(--accent-text);
  }

  .checkbox__input:focus-visible + &__box {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  .checkbox__input:active + &__box {
    transform: scale(0.9);
  }

  @include hover-or-touch($selector-suffix: '+ .checkbox__box', $selector-prefix: '.checkbox__input') {
    box-shadow: inset 0 0 0 1.5px var(--accent);
  }
}
</style>
