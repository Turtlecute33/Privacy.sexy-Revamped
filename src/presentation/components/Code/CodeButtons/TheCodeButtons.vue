<template>
  <div v-if="hasCode" class="container">
    <CodeSaveButton class="code-button" />
    <CodeCopyButton class="code-button" />
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
  justify-content: center;
  gap: 12px;
}

.code-button {
  width: 140px;
  max-width: calc(50% - 6px);
}
</style>
