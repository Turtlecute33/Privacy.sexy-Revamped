<template>
  <div class="button-wrapper">
    <button
      class="button"
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
  position: relative;
  height: 44px;
  .button {
    position: absolute;
    width: 100%;
    height: 100%;
  }
}

.button {
  @include reset-button;

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: $color-secondary;
  color: $color-on-secondary;

  border: 1px solid $color-secondary;
  transition:
    background-color $motion-duration-fast $motion-ease-standard,
    color $motion-duration-fast $motion-ease-standard,
    border-color $motion-duration-fast $motion-ease-standard,
    transform $motion-duration-standard $motion-ease-out;
  overflow: hidden;
  box-shadow: none;
  border-radius: 12px;

  @include clickable;

  .button__icon {
    margin-right: 9px;
    font-size: $font-size-absolute-normal;
  }

  @include hover-or-touch {
    background: rgba($color-on-primary, 0.06);
    color: $color-on-primary;
    border-color: rgba($color-secondary, 0.7);
    transform: translateY(-1px);
  }

  .button__text {
    display: block;
    font-size: $font-size-absolute-small;
    font-weight: 700;
  }
}
</style>
