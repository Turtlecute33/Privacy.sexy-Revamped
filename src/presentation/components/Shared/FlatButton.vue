<template>
  <!-- Use `button` instead of DIV as it is semantically correct and accessibility best-practice -->
  <button
    v-non-collapsing
    type="button"
    class="flat-button"
    :disabled="disabled || undefined"
    :aria-disabled="disabled || undefined"
    :aria-pressed="pressed"
    :class="{
      disabled,
      'is-pressed': pressed,
    }"
    @click="onClicked"
  >
    <AppIcon v-if="icon" :icon="icon" />
    <span v-if="label">{{ label }}</span>
  </button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { NonCollapsing } from '@/presentation/components/Scripts/View/Cards/NonCollapsingDirective';
import type { IconName } from '@/presentation/components/Shared/Icon/IconName';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';

export default defineComponent({
  components: { AppIcon },
  directives: { NonCollapsing },
  props: {
    label: {
      type: String,
      default: undefined,
      required: false,
    },
    disabled: {
      type: Boolean,
      default: false,
      required: false,
    },
    /**
     * Toggle state for buttons that act as a selectable option (e.g. OS/preset
     * pickers). When set, exposes `aria-pressed` so assistive tech announces the
     * button as "pressed"/"selected" rather than "unavailable". Leave undefined
     * for regular (non-toggle) buttons so no `aria-pressed` is emitted.
     */
    pressed: {
      type: Boolean,
      default: undefined,
      required: false,
    },
    icon: {
      type: String as PropType<IconName | undefined>,
      default: undefined,
      required: false,
    },
  },
  emits: [
    'click',
  ],
  setup(props, { emit }) {
    function onClicked() {
      if (props.disabled) {
        return;
      }
      emit('click');
    }
    return { onClicked };
  },
});

</script>

<style lang="scss" scoped>
@use "@/presentation/assets/styles/main" as *;

.flat-button {
  @include reset-button;
  @include clickable;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  display: inline-flex;
  gap: 7px;
  font-size: $font-size-absolute-small;
  line-height: 1.2;
  transition:
    color $motion-duration-fast $motion-ease-standard,
    background-color $motion-duration-fast $motion-ease-standard,
    border-color $motion-duration-fast $motion-ease-standard,
    transform $motion-duration-standard $motion-ease-out;

  // Selected/active toggle option (e.g. current OS or preset).
  &.is-pressed {
    border-color: rgba($color-secondary, 0.45);
    background: rgba($color-secondary, 0.16);
    color: $color-secondary-light;
    opacity: 1;
  }

  // Genuinely unavailable option: dimmed and non-interactive.
  &.disabled {
    color: rgba($color-on-primary, 0.4);
    cursor: not-allowed;
  }

  &:not(.disabled):not(.is-pressed) {
    color: inherit;

    @include hover-or-touch {
      border-color: rgba($color-on-primary, 0.12);
      background: rgba($color-on-primary, 0.07);
      color: $color-on-primary;
      transform: translateY(-1px);
    }
  }

  &:focus-visible {
    outline: 3px solid $color-secondary;
    outline-offset: 2px;
  }
}

@media (pointer: coarse) {
  .flat-button {
    min-height: 44px;
  }
}
</style>
