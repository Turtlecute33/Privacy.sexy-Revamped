<template>
  <MarkdownText
    :text="title"
    class="node-title"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MarkdownText from './Markdown/MarkdownText.vue';

export default defineComponent({
  components: {
    MarkdownText,
  },
  props: {
    title: {
      type: String,
      required: true,
    },
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.node-title {
  display: block;
  color: rgba($color-on-primary, 0.92);
  font-size: $font-size-absolute-small;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
