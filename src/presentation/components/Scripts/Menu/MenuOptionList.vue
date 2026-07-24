<template>
  <div class="list">
    <div v-if="label" :id="labelId">
      {{ label }}:
    </div>
    <div class="items" role="group" :aria-labelledby="label ? labelId : undefined">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  props: {
    label: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const labelId = computed<string | undefined>(() => (props.label
      ? `menu-option-list-${props.label.toLowerCase().replace(/\s+/g, '-')}`
      : undefined));
    return { labelId };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.list {
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 12px;
  width: 100%;
  color: rgba($color-on-primary, 0.84);
  font-size: $font-size-absolute-small;
  line-height: 1.4;

  :deep(.items) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  > :first-child:not(.items) {
    flex: 0 0 auto;
    font-family: $font-family-monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}

@media screen and (max-width: $media-screen-small-width) {
  .list {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
