<template>
  <SizeObserver
    @size-changed="sizeChanged()"
  >
    <div
      class="code-area-shell"
      :class="{ 'is-loading': isLoading }"
      :aria-busy="isLoading"
    >
      <!-- `data-test-highlighted-range` is a test hook for assessing highlighted text range -->
      <div
        :id="editorId"
        :data-test-highlighted-range="highlightedRange"
        class="code-area"
      />
      <div v-if="isLoading" class="code-area-loading" role="status">
        <span class="code-area-loading__indicator" aria-hidden="true" />
        Preparing script preview
      </div>
    </div>
  </SizeObserver>
</template>

<script lang="ts">
import {
  defineComponent, onUnmounted, onMounted, ref,
} from 'vue';
import { injectKey } from '@/presentation/injectionSymbols';
import type { ICodeChangedEvent } from '@/application/Context/State/Code/Event/ICodeChangedEvent';
import type { Script } from '@/domain/Executables/Script/Script';
import { ScriptLanguage } from '@/domain/ScriptMetadata/ScriptLanguage';
import type { IReadOnlyCategoryCollectionState } from '@/application/Context/State/ICategoryCollectionState';
import { CodeBuilderFactory } from '@/application/Context/State/Code/Generation/CodeBuilderFactory';
import SizeObserver from '@/presentation/components/Shared/SizeObserver.vue';
import type { ProjectDetails } from '@/domain/Project/ProjectDetails';
import type {
  SupportedSyntaxLanguage, CodeEditor, CodeEditorFactory, CodeEditorStyleHandle,
} from './CodeEditorFactory';

export default defineComponent({
  components: {
    SizeObserver,
  },
  setup() {
    const { onStateChange, currentState } = injectKey((keys) => keys.useCollectionState);
    const { projectDetails } = injectKey((keys) => keys.useApplication);
    const { events } = injectKey((keys) => keys.useAutoUnsubscribedEvents);

    const editorId = 'codeEditor';
    const highlightedRange = ref(0);
    const isLoading = ref(true);

    let editor: CodeEditor | undefined;
    let currentMarker: CodeEditorStyleHandle | undefined;
    let createEditor: CodeEditorFactory | undefined;
    let isMounted = false;

    onUnmounted(() => {
      isMounted = false;
      destroyEditor();
    });

    onMounted(async () => { // allow the interface to paint before parsing the editor bundle
      isMounted = true;
      const { initializeAceEditor } = await import('./Ace/AceCodeEditorFactory');
      if (!isMounted) {
        return;
      }
      createEditor = initializeAceEditor;
      onStateChange((newState) => {
        handleNewState(newState);
      }, { immediate: true });
      isLoading.value = false;
    });

    function handleNewState(newState: IReadOnlyCategoryCollectionState) {
      destroyEditor();
      editor = createEditor?.({
        editorContainerElementId: editorId,
        language: getLanguage(newState.collection.scriptMetadata.language),
      });
      const appCode = newState.code;
      updateCode(appCode.current, newState.collection.scriptMetadata.language);
      events.unsubscribeAllAndRegister([
        appCode.changed.on((code) => handleCodeChange(code)),
      ]);
    }

    function updateCode(code: string, language: ScriptLanguage) {
      const innerCode = code || getDefaultCode(language, projectDetails);
      editor?.setContent(innerCode);
    }

    function handleCodeChange(event: ICodeChangedEvent) {
      removeCurrentHighlighting();
      updateCode(event.code, currentState.value.collection.scriptMetadata.language);
      if (event.addedScripts?.length > 0) {
        reactToChanges(event, event.addedScripts);
      } else if (event.changedScripts?.length > 0) {
        reactToChanges(event, event.changedScripts);
      }
    }

    function sizeChanged() {
      editor?.updateSize();
    }

    function destroyEditor() {
      editor?.destroy();
      editor = undefined;
    }

    function removeCurrentHighlighting() {
      if (!currentMarker) {
        return;
      }
      currentMarker?.clearStyle();
      currentMarker = undefined;
      highlightedRange.value = 0;
    }

    function reactToChanges(event: ICodeChangedEvent, scripts: ReadonlyArray<Script>) {
      const positions = scripts
        .map((script) => event.getScriptPositionInCode(script));
      const start = Math.min(
        ...positions.map((position) => position.startLine),
      );
      const end = Math.max(
        ...positions.map((position) => position.endLine),
      );
      editor?.scrollToLine(end + 2);
      highlight(start, end);
    }

    function highlight(startRow: number, endRow: number) {
      currentMarker = editor?.applyStyleToLineRange(startRow, endRow, 'code-area__highlight');
      highlightedRange.value = endRow - startRow;
    }

    return {
      editorId,
      highlightedRange,
      isLoading,
      sizeChanged,
    };
  },
});

function getLanguage(language: ScriptLanguage): SupportedSyntaxLanguage {
  switch (language) {
    case ScriptLanguage.batchfile: return 'batchfile';
    case ScriptLanguage.shellscript: return 'shellscript';
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

function getDefaultCode(language: ScriptLanguage, project: ProjectDetails): string {
  return new CodeBuilderFactory()
    .create(language)
    .appendCommentLine(`${project.name} — ${project.slogan}`)
    /*
      Keep the slogan without a period for impact and continuity.
      Slogans should be punchy and memorable, not punctuated like full sentences.
    */
    .appendCommentLine(' 🔐 Enforce privacy & security best-practices on Windows, macOS and Linux.')
    .appendLine()
    .appendCommentLine('-- 🤔 How to use')
    .appendCommentLine(' 📙 Start by exploring different categories and choosing different tweaks.')
    .appendCommentLine(' 📙 On top left, you can apply predefined selections for privacy level you\'d like.')
    .appendCommentLine(' 📙 After you choose any tweak, you can download or copy to execute your script.')
    .appendCommentLine(' 📙 Come back regularly to apply latest version for stronger privacy and security.')
    .appendLine()
    .appendCommentLine(`-- 🧐 Why ${project.name}`)
    .appendCommentLine(' ✔️ Rich tweak pool to harden security & privacy of the OS and other software on it.')
    .appendCommentLine(' ✔️ No need to run any compiled software on your system, just run the generated scripts.')
    .appendCommentLine(' ✔️ Have full visibility into what the tweaks do as you enable them.')
    .appendCommentLine(' ✔️ Open-source and free (both free as in beer and free as in speech).')
    .appendCommentLine(' ✔️ Committed to your safety with strong security measures.')
    .toString();
}

</script>

<style scoped lang="scss">
@use "@/presentation/assets/styles/main" as *;

:deep() {
  .code-area-shell {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 540px;
    background: $color-primary-darkest;
  }

  .code-area {
    min-height: 540px;
    width: 100%;
    height: 100%;
    // `overflow: auto` creates duplicate scrollbars with the editor's built-in scrolling mechanism on some edge case screen sizes
    font-size: $font-size-absolute-small;
    font-family: $font-family-monospace;
    &__highlight {
      background-color: rgba($color-secondary, 0.24);
      position: absolute;
    }
  }
}

.code-area-loading {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 12px;
  color: rgba($color-on-primary, 0.64);
  font-family: $font-family-monospace;
  font-size: $font-size-absolute-x-small;
  letter-spacing: 0.04em;
}

.code-area-loading__indicator {
  width: 24px;
  height: 24px;
  border: 2px solid rgba($color-on-primary, 0.14);
  border-top-color: $color-secondary;
  border-radius: 50%;
  animation: code-area-loading-spin 800ms linear infinite;
}

@keyframes code-area-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media screen and (max-width: $media-vertical-view-breakpoint) {
  :deep() {
    .code-area-shell,
    .code-area {
      min-height: 420px;
    }
  }
}
</style>
