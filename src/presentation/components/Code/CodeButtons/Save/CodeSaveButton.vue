<template>
  <div>
    <IconButton
      text="Download"
      icon-name="file-arrow-down"
      @click="saveCode"
    />
    <ModalDialog v-model="areInstructionsVisible">
      <BrowserRunInstructions :filename="filename" />
    </ModalDialog>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, ref, computed,
} from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import ModalDialog from '@/presentation/components/Shared/Modal/ModalDialog.vue';
import { ScriptLanguage } from '@/domain/ScriptMetadata/ScriptLanguage';
import { type ScriptMetadata } from '@/domain/ScriptMetadata/ScriptMetadata';
import { ScriptFilename } from '@/application/CodeRunner/ScriptFilename';
import { FileType } from '@/presentation/common/Dialog';
import IconButton from '../IconButton.vue';
import { createScriptErrorDialog } from '../ScriptErrorDialog';
import BrowserRunInstructions from './BrowserRunInstructions/BrowserRunInstructions.vue';

export default defineComponent({
  components: {
    IconButton,
    BrowserRunInstructions,
    ModalDialog,
  },
  setup() {
    const { currentState } = injectKey((keys) => keys.useCollectionState);
    const { dialog } = injectKey((keys) => keys.useDialog);

    const areInstructionsVisible = ref(false);
    const filename = computed<string>(
      () => buildFilename(currentState.value.collection.scriptMetadata),
    );

    async function saveCode() {
      const { success, error } = await dialog.saveFile(
        currentState.value.code.current,
        filename.value,
        getType(currentState.value.collection.scriptMetadata.language),
      );
      if (!success) {
        dialog.showError(...(await createScriptErrorDialog({
          errorType: error.type,
          errorMessage: error.message,
        })));
        return;
      }
      areInstructionsVisible.value = true;
    }

    return {
      areInstructionsVisible,
      filename,
      saveCode,
    };
  },
});

function getType(language: ScriptLanguage) {
  switch (language) {
    case ScriptLanguage.batchfile:
      return FileType.BatchFile;
    case ScriptLanguage.shellscript:
      return FileType.ShellScript;
    default:
      throw new Error('unknown file type');
  }
}

function buildFilename(scriptMetadata: ScriptMetadata) {
  if (scriptMetadata.fileExtension) {
    return `${ScriptFilename}.${scriptMetadata.fileExtension}`;
  }
  return ScriptFilename;
}
</script>
