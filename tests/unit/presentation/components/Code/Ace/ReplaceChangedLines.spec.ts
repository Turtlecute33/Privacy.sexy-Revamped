import { describe, it, expect } from 'vitest';
import ace from '@/presentation/components/Code/Ace/ace-importer';
import { findChangedLineRange, replaceChangedLines } from '@/presentation/components/Code/Ace/ReplaceChangedLines';
import type { Ace } from 'ace-builds';

describe('ReplaceChangedLines', () => {
  describe('replaceChangedLines', () => {
    describe('produces the new content', () => {
      const testScenarios: ReadonlyArray<{
        readonly description: string;
        readonly currentContent: string;
        readonly newContent: string;
      }> = [
        { description: 'insertion in the middle', currentContent: 'a\nb\nd', newContent: 'a\nb\nc\nd' },
        { description: 'insertion at the start', currentContent: 'b\nc', newContent: 'a\nb\nc' },
        { description: 'insertion at the end', currentContent: 'a\nb', newContent: 'a\nb\nc' },
        { description: 'removal in the middle', currentContent: 'a\nb\nc\nd', newContent: 'a\nd' },
        { description: 'removal at the start', currentContent: 'a\nb\nc', newContent: 'c' },
        { description: 'removal at the end', currentContent: 'a\nb\nc', newContent: 'a' },
        { description: 'replacement in the middle', currentContent: 'a\nx\nd', newContent: 'a\ny\nz\nd' },
        { description: 'replacement of everything', currentContent: 'x\ny', newContent: 'a\nb\nc' },
        { description: 'filling an empty document', currentContent: '', newContent: 'a\nb\n' },
        { description: 'emptying the document', currentContent: 'a\nb', newContent: '' },
        { description: 'removing one of repeated lines', currentContent: 'a\na\na', newContent: 'a\na' },
        { description: 'adding to repeated lines', currentContent: 'a\na', newContent: 'a\na\na' },
        { description: 'a change before a trailing newline', currentContent: 'a\nb\n', newContent: 'a\nc\n' },
        { description: 'a change within a line', currentContent: 'echo one\necho two', newContent: 'echo one\necho 2' },
        { description: 'Windows line endings', currentContent: 'a\r\nb\r\nc', newContent: 'a\r\nx\r\nc' },
      ];
      testScenarios.forEach(({ description, currentContent, newContent }) => {
        it(description, () => {
          // arrange
          const document = createDocument(currentContent);
          const expectedLines = newContent.split(/\r\n|\r|\n/);

          // act
          replaceChangedLines(document, newContent);

          // assert
          expect(document.getAllLines()).to.deep.equal(expectedLines);
        });
      });
    });

    it('does not edit the document when the content is identical', () => {
      // arrange
      const content = 'a\nb\nc';
      const document = createDocument(content);
      const deltas = recordDeltas(document);

      // act
      replaceChangedLines(document, content);

      // assert
      expect(deltas).to.have.lengthOf(0);
    });

    it('edits only the rows that differ', () => {
      // arrange
      const lines = Array.from({ length: 1000 }, (_, index) => `echo ${index}`);
      const document = createDocument(lines.join('\n'));
      const deltas = recordDeltas(document);
      const newLines = [...lines.slice(0, 500), 'echo inserted', ...lines.slice(500)];

      // act
      replaceChangedLines(document, newLines.join('\n'));

      // assert
      expect(document.getAllLines()).to.deep.equal(newLines);
      const editedRows = deltas.flatMap((delta) => [delta.start.row, delta.end.row]);
      expect(Math.min(...editedRows)).to.be.at.least(499);
      expect(Math.max(...editedRows)).to.be.at.most(501);
    });
  });

  describe('findChangedLineRange', () => {
    it('returns nothing for identical lines', () => {
      // arrange
      const lines = ['a', 'b'];

      // act
      const range = findChangedLineRange(lines, [...lines]);

      // assert
      expect(range).to.equal(undefined);
    });

    it('does not let the common suffix overlap the common prefix', () => {
      // arrange
      const currentLines = ['a', 'a'];
      const newLines = ['a', 'a', 'a'];

      // act
      const range = findChangedLineRange(currentLines, newLines);

      // assert
      expect(range).to.deep.equal({ firstRow: 2, currentEndRow: 2, newEndRow: 3 });
    });

    it('bounds the changed block on both sides', () => {
      // arrange
      const currentLines = ['head', 'old', 'tail'];
      const newLines = ['head', 'new 1', 'new 2', 'tail'];

      // act
      const range = findChangedLineRange(currentLines, newLines);

      // assert
      expect(range).to.deep.equal({ firstRow: 1, currentEndRow: 2, newEndRow: 3 });
    });
  });
});

function createDocument(content: string): Ace.Document {
  return new ace.EditSession(content).getDocument();
}

function recordDeltas(document: Ace.Document): Ace.Delta[] {
  const deltas: Ace.Delta[] = [];
  document.on('change', (delta: Ace.Delta) => {
    deltas.push(delta);
  });
  return deltas;
}
