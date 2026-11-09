<template>
  <div class="button-wrapper">
    <button
      class="button"
      :class="{ 'button--primary': primary }"
      type="button"
      @click="onClicked"
    >
      <AppIcon
        class="button__icon"
        :icon="iconName"
      />
      <div class="button__text">
        {{ text }}
      </div>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { IconName } from '@/presentation/components/Shared/Icon/IconName';
import AppIcon from '@/presentation/components/Shared/Icon/AppIcon.vue';

export default defineComponent({
  components: {
    AppIcon,
  },
  props: {
    text: {
      type: String,
      required: true,
    },
    iconName: {
      type: String as PropType<IconName>,
      required: true,
    },
    /** Filled with the accent colour, for the one action a view leads to. */
    primary: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'click',
  ],
  setup(_, { emit }) {
    function onClicked() {
      emit('click');
    }

    return {
      onClicked,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.button-wrapper {
  display: inline-flex;
}

/*
  Capsules: a neutral glass chip for secondary actions, and a filled accent capsule with a lit top
  edge for the primary one.
*/
.button {
  @include reset-button;
  @include clickable;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 34px;
  padding: 0 15px;
  border-radius: 999px;
  background: var(--fill-track);
  box-shadow: inset 0 0 0 1px var(--hairline);
  color: var(--text);
  white-space: nowrap;
  transition:
    background-color $motion-duration-fast $motion-ease-standard,
    box-shadow $motion-duration-fast $motion-ease-standard,
    transform $motion-duration-standard $motion-ease-out;

  .button__icon {
    font-size: 13px;
  }

  .button__text {
    display: block;
    font-size: $font-size-absolute-small;
    font-weight: 600;
  }

  @include hover-or-touch {
    background: var(--fill-hover);
    box-shadow: inset 0 0 0 1px var(--control-edge);
  }

  &:active {
    transform: scale(0.97);
  }

  @include focus-ring;

  &--primary {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0) 60%),
      var(--accent);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 6px 16px -6px var(--accent);
    color: var(--on-accent);

    @include hover-or-touch {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0) 60%),
        var(--accent-hover);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.35),
        0 8px 20px -6px var(--accent);
    }
  }
}

@media (pointer: coarse) {
  .button {
    height: 44px;
  }
}
</style>
