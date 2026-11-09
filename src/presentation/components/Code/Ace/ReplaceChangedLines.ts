import { AceRange } from './ace-importer';
import type { Ace } from 'ace-builds';

/*
  Updates an Ace document to new content by editing only the block of lines that differs.

  `editor.setValue()` swaps the whole document, and Ace then rebuilds its soft-wrap data and
  re-tokenizes every line of it. Toggling one script in a 3,700-line selection paid for all 3,700
  lines on every click. The generated script only ever changes in one block (the scripts that were
  added, removed or reverted), so editing that block lets Ace update its wrap and token caches for
  those rows alone: its background tokenizer stops once the line states match again.
*/
export function replaceChangedLines(document: Ace.Document, content: string): void {
  const currentLines = document.getAllLines();
  const newLines = splitIntoLines(content);
  const change = findChangedLineRange(currentLines, newLines);
  if (!change) {
    return;
  }
  const insertedLines = newLines.slice(change.firstRow, change.newEndRow);
  if (change.currentEndRow === change.firstRow) {
    document.insertFullLines(change.firstRow, insertedLines);
    return;
  }
  if (change.newEndRow === change.firstRow) {
    document.removeFullLines(change.firstRow, change.currentEndRow - 1);
    return;
  }
  const lastReplacedRow = change.currentEndRow - 1;
  document.replace(
    new AceRange(change.firstRow, 0, lastReplacedRow, currentLines[lastReplacedRow].length),
    insertedLines.join('\n'),
  );
}

export interface ChangedLineRange {
  /** First row that differs; rows before it are identical in both versions. */
  readonly firstRow: number;
  /** End of the differing block in the current lines, exclusive. */
  readonly currentEndRow: number;
  /** End of the differing block in the new lines, exclusive. */
  readonly newEndRow: number;
}

/*
  Trims the longest common prefix, then the longest common suffix that does not overlap it. What is
  left is one block per version; either may be empty (a pure insertion or removal), never both.
  Returns `undefined` when the versions are identical.
*/
export function findChangedLineRange(
  currentLines: readonly string[],
  newLines: readonly string[],
): ChangedLineRange | undefined {
  const sharedLength = Math.min(currentLines.length, newLines.length);
  let firstRow = 0;
  while (firstRow < sharedLength && currentLines[firstRow] === newLines[firstRow]) {
    firstRow++;
  }
  if (firstRow === currentLines.length && firstRow === newLines.length) {
    return undefined;
  }
  let currentEndRow = currentLines.length;
  let newEndRow = newLines.length;
  while (
    currentEndRow > firstRow
    && newEndRow > firstRow
    && currentLines[currentEndRow - 1] === newLines[newEndRow - 1]
  ) {
    currentEndRow--;
    newEndRow--;
  }
  return { firstRow, currentEndRow, newEndRow };
}

/* Splits the way Ace's own document does, so row numbers line up with what it stores. */
function splitIntoLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}
