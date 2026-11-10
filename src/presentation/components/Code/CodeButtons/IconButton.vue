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
  Flat capsules: a neutral fill for secondary actions, a solid accent fill for the primary one.
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
  color: var(--text);
  white-space: nowrap;
  transition:
    background-color $motion-duration-fast $motion-ease-standard,
    box-shadow $motion-duration-fast $motion-ease-standard,
    transform $motion-duration-standard $motion-ease-out;

  .button__icon {
    font-size: 14px;
  }

  .button__text {
    display: block;
    font-size: $font-size-absolute-small;
    font-weight: 500;
  }

  @include hover-or-touch {
    background: var(--fill-hover);
  }

  &:active {
    transform: scale(0.97);
  }

  @include focus-ring;

  &--primary {
    background: var(--accent);
    color: var(--on-accent);

    @include hover-or-touch {
      background: var(--accent-hover);
    }
  }
}

@media (pointer: coarse) {
  .button {
    height: 44px;
  }
}
</style>
