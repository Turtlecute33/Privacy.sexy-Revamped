<template>
  <div
    class="toggle-switch"
    @click="onClick"
  >
    <input
      v-model="isChecked"
      type="checkbox"
      class="toggle-input"
      :aria-label="`${isChecked ? label : resolvedOffLabel} this setting`"
    >
    <div class="toggle-animation">
      <div class="circle" />
      <span
        class="label"
        :class="{
          'label-off': !isChecked,
          'label-on': isChecked,
        }"
      >
        {{ isChecked ? label : resolvedOffLabel }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  props: {
    modelValue: Boolean,
    label: {
      type: String,
      required: true,
    },
    offLabel: {
      type: String,
      default: undefined,
    },
    stopClickPropagation: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    'update:modelValue': (isChecked: boolean) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props, { emit }) {
    const isChecked = computed({
      get() {
        return props.modelValue;
      },
      set(value: boolean) {
        if (value === props.modelValue) {
          return;
        }
        emit('update:modelValue', value);
      },
    });

    function onClick(event: Event): void {
      if (props.stopClickPropagation) {
        event.stopPropagation();
      }
      isChecked.value = !isChecked.value;
    }

    const resolvedOffLabel = computed(() => props.offLabel ?? props.label);

    return {
      isChecked,
      onClick,
      resolvedOffLabel,
    };
  },
});
</script>

<style scoped lang="scss">
@use 'sass:math';
@use "@/presentation/assets/styles/main" as *;

$font-size                    : 11px;

/*
  The switch appears once per reversible script, so its resting state stays a quiet
  neutral. Only the active "revert" state takes the accent colour, since that is the
  state worth noticing in a long list.
*/
$color-toggle-unchecked       : rgba($color-on-primary, 0.5);
$color-toggle-checked         : $color-on-secondary;
$color-text-unchecked         : rgba($color-on-primary, 0.68);
$color-text-checked           : $color-on-secondary;
$color-bg-unchecked           : rgba($color-on-primary, 0.07);
$color-bg-checked             : $color-secondary;
$padding-horizontal           : 5px;
$size-width                   : 76px;
$size-height                  : 22px;
$size-circle                  : 10px;

$gap-between-circle-and-text  : $spacing-relative-x-small;

@mixin locateNearCircle($direction: 'left') {
  $circle-width: calc(#{$size-circle} + #{$padding-horizontal});
  $circle-space: calc(#{$circle-width} + #{$gap-between-circle-and-text});
  @if $direction == 'left' {
    margin-left: $circle-space;
  } @else {
    margin-right: $circle-space;
  }
}

.toggle-switch {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  width: auto;

  font-size: $font-size;
  min-height: 26px;
  border-radius: $size-height;

  /*
    Keyboard focus still gets a ring, but clicking does not paint one. `:focus-within`
    fired for pointer clicks too, which left a green halo around every switch the user
    touched.
  */
  &:has(input.toggle-input:focus-visible) {
    outline: 3px solid rgba($color-secondary, 0.55);
    outline-offset: 2px;
  }

  input.toggle-input {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    @include clickable;
  }

  .toggle-animation {
    display: flex;
    align-items: center;
    gap: $gap-between-circle-and-text;
    width: $size-width;
    height: $size-height;
    background-color: $color-bg-unchecked;
    border: 1px solid rgba($color-on-primary, 0.22);
    border-radius: $size-height;
    transition: background-color $motion-duration-standard $motion-ease-standard;

    .circle {
      display: block;
      position: absolute;
      $initial-top: 50%;
      $centered-top-offset: math.div($size-circle, 2);
      $centered-top: calc(#{$initial-top} - #{$centered-top-offset});
      top: $centered-top;
      left: $padding-horizontal;
      width: $size-circle;
      height: $size-circle;
      border-radius: 50%;
      background-color: $color-toggle-unchecked;
      transition:
        background-color $motion-duration-fast $motion-ease-standard,
        transform $motion-duration-emphasized $motion-ease-out;
    }
  }

  input.toggle-input:checked + .toggle-animation {
    background-color: $color-bg-checked;
    flex-direction: row-reverse;

    .circle {
      background-color: $color-toggle-checked;
      transform: translateX($size-width - $size-circle - (2 * $padding-horizontal));
    }
  }

  .label {
    // Sized to the longest label ("Revert") so neither state clips.
    width: 42px;
    min-width: 42px;
    font-weight: bold;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    transition: color $motion-duration-fast $motion-ease-standard;

    &.label-off {
      color: $color-text-unchecked;

      @include locateNearCircle('left');
      padding-right: $padding-horizontal;
    }

    &.label-on {
      color: $color-text-checked;

      @include locateNearCircle('right');
      padding-left: $padding-horizontal;
    }
  }
}

@media (pointer: coarse) {
  .toggle-switch {
    min-height: 44px;
  }
}
</style>
