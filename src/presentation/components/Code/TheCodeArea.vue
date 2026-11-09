<template>
  <SizeObserver
    @size-changed="sizeChanged()"
  >
    <div
      ref="shellElement"
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
      <!--
        The placeholder occupies the same reserved box as the editor, so swapping one for the other
        shifts no layout. The spinner only appears once the editor chunk is actually on its way:
        the chunk is no longer fetched on every page view, so a visitor who never reaches this pane
        would otherwise be left with a spinner and `aria-busy="true"` that never resolve.

        Deliberately not a live region. Its text mutates from 'Script preview' to 'Preparing script
        preview' when the chunk is requested, and a live region announces mutations even though it
        never announces its initial content. So `role="status"` here would read the loading message
        out on the first tap anywhere in the document, which is what triggers the load. The busy
        state is already on the shell as `aria-busy`.
      -->
      <div v-if="!isEditorReady" class="code-area-loading">
        <span v-if="isLoading" class="code-area-loading__indicator" aria-hidden="true" />
        {{ isLoading ? 'Preparing script preview' : 'Script preview' }}
      </div>
    </div>
  </SizeObserver>
</template>

<script lang="ts">
import {
  computed, defineComponent, onUnmounted, onMounted, ref, shallowRef,
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

/*
  Ace is a 473 KB (133 KB gzipped) chunk. Importing it unconditionally from `onMounted` made it a
  fourth serialized step in the cold-load waterfall (html -> entry -> collection data -> mount ->
  Ace), where it competed for bandwidth with the content that decides LCP. Nothing above the fold
  needs it: below the vertical-view breakpoint the code pane sits under the entire selection UI.
  So the chunk is fetched on the first evidence that a human is going to read it, and a synthetic
  run that never scrolls and never clicks never pays for it.
*/
const EDITOR_INTENT_EVENTS = ['pointerdown', 'keydown'] as const;

/*
  Captured, so the load starts on the way down even if a handler further in stops propagation, and
  passive, which declares that the handler never calls `preventDefault()`. Blink only turns that
  declaration into a non-blocking handler class for wheel and touch events, so it buys nothing on
  the compositor for `pointerdown` and `keydown`; it is kept as a standing guard, so a future
  `loadEditor` cannot quietly gain the ability to cancel the interaction that triggered it.
*/
const EDITOR_INTENT_LISTENER_OPTIONS: AddEventListenerOptions = {
  once: true,
  passive: true,
  capture: true,
};

/*
  Roughly one thumb flick of lead time: the download starts while the pane is still below the fold,
  so on a mid-range phone the editor is usually ready by the time the pane is actually on screen.
*/
const EDITOR_VISIBILITY_MARGIN = '200px 0px';

export default defineComponent({
  components: {
    SizeObserver,
  },
  setup() {
    const { onStateChange, currentState } = injectKey((keys) => keys.useCollectionState);
    const { projectDetails } = injectKey((keys) => keys.useApplication);
    const { events } = injectKey((keys) => keys.useAutoUnsubscribedEvents);

    const editorId = 'codeEditor';
    const shellElement = shallowRef<HTMLElement>();
    const highlightedRange = ref(0);
    const editorStatus = ref<'idle' | 'requested' | 'ready'>('idle');
    const isLoading = computed(() => editorStatus.value === 'requested');
    const isEditorReady = computed(() => editorStatus.value === 'ready');

    let editor: CodeEditor | undefined;
    let currentMarker: CodeEditorStyleHandle | undefined;
    let createEditor: CodeEditorFactory | undefined;
    let visibilityObserver: IntersectionObserver | undefined;
    let lastCodeChange: ICodeChangedEvent | undefined;
    let isMounted = false;

    /*
      Subscribing at setup time rather than after the import is what keeps the highlight correct.
      The `code.changed` subscription that `handleNewState` registers is the only source of
      highlight information, and it used to be created only once Ace had loaded: a script toggled
      before that fired its event into the void, leaving an editor with the right code and no
      highlight. That was a narrow race while the import started at mount; it is the ordinary case
      now that the import starts on the very click that toggles the script.
    */
    onStateChange((newState) => {
      handleNewState(newState);
    }, { immediate: true });

    onMounted(() => {
      isMounted = true;
      /*
        Without an IntersectionObserver there is no cheap way to know whether the pane is on
        screen, so fall back to loading straight away rather than risk a pane that never renders.
      */
      const shell = shellElement.value;
      if (!shell || !('IntersectionObserver' in window)) {
        loadEditor();
        return;
      }
      visibilityObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadEditor();
        }
      }, { rootMargin: EDITOR_VISIBILITY_MARGIN });
      visibilityObserver.observe(shell);
      watchForIntent();
    });

    onUnmounted(() => {
      isMounted = false;
      stopWatchingForIntent();
      destroyEditor();
    });

    function loadEditor() {
      if (editorStatus.value !== 'idle') {
        return;
      }
      editorStatus.value = 'requested';
      stopWatchingForIntent();
      importEditor();
    }

    async function importEditor() {
      let editorModule: typeof import('./Ace/AceCodeEditorFactory');
      try {
        editorModule = await import('./Ace/AceCodeEditorFactory');
      } catch {
        /*
          The chunk can fail to arrive: a flaky network, or a deploy that replaced the hashed file
          after this page loaded. Without this the placeholder kept spinning with `aria-busy` set
          and never retried. The next tap or key press tries again; the visibility observer is not
          re-armed, so a pane already on screen does not retry in a tight loop.
        */
        if (isMounted) {
          editorStatus.value = 'idle';
          watchForIntent();
        }
        return;
      }
      if (!isMounted) {
        return;
      }
      createEditor = editorModule.initializeAceEditor;
      buildEditor(currentState.value);
      editorStatus.value = 'ready';
    }

    function watchForIntent() {
      EDITOR_INTENT_EVENTS.forEach((eventName) => {
        document.addEventListener(eventName, loadEditor, EDITOR_INTENT_LISTENER_OPTIONS);
      });
    }

    function stopWatchingForIntent() {
      visibilityObserver?.disconnect();
      visibilityObserver = undefined;
      EDITOR_INTENT_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, loadEditor, EDITOR_INTENT_LISTENER_OPTIONS);
      });
    }

    function handleNewState(newState: IReadOnlyCategoryCollectionState) {
      lastCodeChange = undefined; // the previous collection's highlight means nothing here
      buildEditor(newState);
      events.unsubscribeAllAndRegister([
        newState.code.changed.on((code) => handleCodeChange(code)),
      ]);
    }

    /*
      Runs both when the collection changes and when the editor chunk finally arrives, so whichever
      happens last rebuilds from the state and the code change that are current by then.
    */
    function buildEditor(state: IReadOnlyCategoryCollectionState) {
      removeCurrentHighlighting();
      destroyEditor();
      if (!createEditor) {
        return; // the chunk is not here yet; `importEditor()` calls back in once it is
      }
      editor = createEditor({
        editorContainerElementId: editorId,
        language: getLanguage(state.collection.scriptMetadata.language),
      });
      updateCode(state.code.current, state.collection.scriptMetadata.language);
      if (lastCodeChange) {
        highlightChangedScripts(lastCodeChange);
      }
    }

    function updateCode(code: string, language: ScriptLanguage) {
      const innerCode = code || getDefaultCode(language, projectDetails);
      editor?.setContent(innerCode);
    }

    function handleCodeChange(event: ICodeChangedEvent) {
      lastCodeChange = event;
      if (!editor) {
        return; // `buildEditor()` replays this event as soon as the editor chunk arrives
      }
      removeCurrentHighlighting();
      updateCode(event.code, currentState.value.collection.scriptMetadata.language);
      highlightChangedScripts(event);
    }

    function highlightChangedScripts(event: ICodeChangedEvent) {
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
      shellElement,
      highlightedRange,
      isLoading,
      isEditorReady,
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
    .appendCommentLine(`${project.name}: ${project.slogan}`)
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
    min-height: 0;
  }

  .code-area {
    min-height: 0;
    width: 100%;
    height: 100%;
    // `overflow: auto` creates duplicate scrollbars with the editor's built-in scrolling mechanism on some edge case screen sizes
    font-size: $font-size-absolute-small;
    font-family: $font-family-monospace;
    line-height: 1.65;
    &__highlight {
      background-color: var(--highlight-code);
      position: absolute;
    }
  }

  /*
    The editor is drawn straight onto the code panel's glass: Ace's themes paint an opaque page and
    gutter, which would turn the pane back into a solid slab. The syntax colours stay the theme's.
    Selectors are qualified with the shell because Ace injects its theme CSS after this sheet.
  */
  .code-area-shell .code-area.ace_editor {
    background: transparent;
    color: var(--text-secondary);
  }

  .code-area-shell .ace_gutter {
    background: transparent;
    color: var(--text-tertiary);
  }

  .code-area-shell .ace_gutter-active-line,
  .code-area-shell .ace_marker-layer .ace_active-line {
    background: var(--fill-hover);
  }

  .code-area-shell .ace_marker-layer .ace_selection {
    background: var(--accent-soft);
  }

  .code-area-shell .ace_scrollbar {
    @include glass-scrollbar;
  }

  /*
    Only in the prerendered snapshot, never rendered by this component: `scripts/prerender.mjs`
    replaces Ace's markup with this plain copy of the script, because Ace's markup is only laid out
    correctly by Ace's own CSS, which the snapshot does not ship. Taken out of flow and stretched
    over the editor's reserved box, so the text never changes the pane's size and nothing moves
    when the app mounts and replaces it. Scrollable for visitors without JavaScript, who keep it.
  */
  .code-area__static-text {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 4px 16px;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: inherit;
    line-height: 1.65;
    color: var(--text-secondary);
  }
}

.code-area-loading {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 12px;
  color: var(--text-tertiary);
  font-size: $font-size-absolute-x-small;
  letter-spacing: 0.02em;
}

.code-area-loading__indicator {
  width: 22px;
  height: 22px;
  border: 2px solid var(--fill-track);
  border-top-color: var(--accent);
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
