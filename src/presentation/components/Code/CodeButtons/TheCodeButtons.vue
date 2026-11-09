<template>
  <div v-if="hasCode" class="container">
    <CodeCopyButton class="code-button" />
    <CodeSaveButton class="code-button" />
  </div>
</template>

<script lang="ts">
import {
  defineComponent, computed,
} from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import CodeCopyButton from './CodeCopyButton.vue';
import CodeSaveButton from './Save/CodeSaveButton.vue';

export default defineComponent({
  components: {
    CodeCopyButton,
    CodeSaveButton,
  },
  setup() {
    const { currentCode } = injectKey((keys) => keys.useCurrentCode);

    const hasCode = computed<boolean>(() => currentCode.value.length > 0);

    return {
      hasCode,
    };
  },
});
</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

.container {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
</style>
