<template>
  <!-- Use `button` instead of DIV as it is semantically correct and accessibility best-practice -->
  <button
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
import type { IconName } from '@/presentation/components/Shared/Icon/IconName';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';

export default defineComponent({
  components: { AppIcon },
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

/* A quiet capsule: text on glass at rest, a soft neutral fill under the pointer. */
.flat-button {
  @include reset-button;
  @include clickable;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  display: inline-flex;
  gap: 7px;
  font-size: $font-size-absolute-small;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  transition:
    color $motion-duration-fast $motion-ease-standard,
    background-color $motion-duration-fast $motion-ease-standard,
    border-color $motion-duration-fast $motion-ease-standard,
    box-shadow $motion-duration-fast $motion-ease-standard;

  // Selected/active toggle option (e.g. current OS or preset).
  &.is-pressed {
    background: var(--lens);
    box-shadow: var(--lens-shadow);
    color: var(--text);
    opacity: 1;
  }

  // Genuinely unavailable option: dimmed and non-interactive.
  &.disabled {
    color: var(--text-tertiary);
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:not(.disabled):not(.is-pressed) {
    color: inherit;

    @include hover-or-touch {
      background: var(--fill-hover);
      color: var(--text);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }
}

@media (pointer: coarse) {
  .flat-button {
    min-height: 44px;
  }
}
</style>
