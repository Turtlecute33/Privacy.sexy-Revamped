import ace, { AceRange } from './ace-importer';
import type { CodeEditorFactory, SupportedSyntaxLanguage } from '../CodeEditorFactory';

/*
  The editor is drawn on the code panel's glass, which is light or dark with the visitor's system
  appearance, so the syntax colours follow it: Tomorrow by day, Tomorrow Night by night.
*/
const CodeEditorThemes = {
  light: 'tomorrow',
  dark: 'tomorrow_night',
} as const;

export const initializeAceEditor: CodeEditorFactory = (options) => {
  const editor = ace.edit(options.editorContainerElementId);
  const mode = getAceModeName(options.language);
  editor.getSession().setMode(`ace/mode/${mode}`);
  const stopFollowingColorScheme = followColorScheme(editor);
  editor.setReadOnly(true);
  editor.setAutoScrollEditorIntoView(true);
  editor.setShowPrintMargin(false); // Hide the vertical line
  editor.getSession().setUseWrapMode(true); // Make code readable on mobile
  hideActiveLineAndCursorUntilInteraction(editor);
  return {
    setContent: (content) => editor.setValue(content, 1),
    destroy: () => {
      stopFollowingColorScheme();
      editor.destroy();
    },
    scrollToLine: (lineNumber) => {
      const column = editor.session.getLine(lineNumber).length;
      if (column === undefined) {
        return;
      }
      editor.gotoLine(lineNumber, column, true);
    },
    updateSize: () => editor?.resize(),
    applyStyleToLineRange: (start, end, className) => {
      const markerId = editor.session.addMarker(
        new AceRange(start, 0, end, 0),
        className,
        'fullLine',
      );
      return {
        clearStyle: () => {
          editor.session.removeMarker(markerId);
        },
      };
    },
  };
};

function followColorScheme(editor: ace.Ace.Editor): () => void {
  const darkSchemeQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : undefined;
  const applyTheme = () => {
    const theme = darkSchemeQuery?.matches ? CodeEditorThemes.dark : CodeEditorThemes.light;
    editor.setTheme(`ace/theme/${theme}`);
  };
  applyTheme();
  darkSchemeQuery?.addEventListener?.('change', applyTheme);
  return () => darkSchemeQuery?.removeEventListener?.('change', applyTheme);
}

function getAceModeName(language: SupportedSyntaxLanguage): string {
  switch (language) {
    case 'batchfile': return 'batchfile';
    case 'shellscript': return 'sh';
    default:
      throw new Error(`Language not supported: ${language}`);
  }
}

function hideActiveLineAndCursorUntilInteraction(editor: ace.Ace.Editor) {
  hideActiveLineAndCursor(editor);
  editor.session.on('change', () => {
    editor.session.selection.clearSelection();
    hideActiveLineAndCursor(editor);
  });
  editor.session.selection.on('changeSelection', () => {
    showActiveLineAndCursor(editor);
  });
}

function hideActiveLineAndCursor(editor: ace.Ace.Editor): void {
  editor.setHighlightGutterLine(false); // Remove highlighting on line number column
  editor.setHighlightActiveLine(false); // Remove highlighting throughout the line
  setCursorVisibility(false, editor);
}

function showActiveLineAndCursor(editor: ace.Ace.Editor): void {
  editor.setHighlightGutterLine(true); // Show highlighting on line number column
  editor.setHighlightActiveLine(true); // Show highlighting throughout the line
  setCursorVisibility(true, editor);
}

// Shows/removes vertical line after focused character
function setCursorVisibility(
  isVisible: boolean,
  editor: ace.Ace.Editor,
) {
  const cursor = editor.renderer.container.querySelector('.ace_cursor-layer') as HTMLElement;
  if (!cursor) {
    throw new Error('Cannot find Ace cursor, did Ace change its rendering?');
  }
  cursor.style.display = isVisible ? '' : 'none';
  // Implementation options for cursor visibility:
  //   ❌ editor.renderer.showCursor() and hideCursor(): Not functioning as expected
  //   ❌ editor.renderer.#cursorLayer: No longer part of the public API
  //   ✅ .ace_hidden-cursors { opacity: 0; }: Hides cursor when not focused
  //      Pros: Works more automatically
  //      Cons: Provides less control over visibility toggling
}
