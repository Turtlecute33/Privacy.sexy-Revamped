import { describe, it, expect } from 'vitest';
import { BatchBuilder } from '@/application/Context/State/Code/Generation/Languages/BatchBuilder';

describe('BatchBuilder', () => {
  class BatchBuilderRevealer extends BatchBuilder {
    public getCommentDelimiter(): string {
      return super.getCommentDelimiter();
    }

    public writeStandardOut(text: string): string {
      return super.writeStandardOut(text);
    }

    public getNewLineTerminator(): string {
      return super.getNewLineTerminator();
    }

    public escapeCommentText(text: string): string {
      return super.escapeCommentText(text);
    }
  }
  describe('escapeCommentText', () => {
    it('doubles percent signs, which cmd expands even on comment lines', () => {
      // arrange
      const expected = 'Disable 100%%~ of it';
      const sut = new BatchBuilderRevealer();
      // act
      const actual = sut.escapeCommentText('Disable 100%~ of it');
      // assert
      expect(actual).to.equal(expected);
    });
  });
  describe('getCommentDelimiter', () => {
    it('returns expected', () => {
      // arrange
      const expected = '::';
      const sut = new BatchBuilderRevealer();
      // act
      const actual = sut.getCommentDelimiter();
      // assert
      expect(expected).to.equal(actual);
    });
  });
  describe('writeStandardOut', () => {
    const testData = [
      {
        name: 'plain text',
        text: 'test',
        expected: 'echo test',
      },
      {
        name: 'text with ampersand',
        text: 'a & b',
        expected: 'echo a ^& b',
      },
      {
        name: 'text with percent sign',
        text: '90%',
        expected: 'echo 90%%',
      },
      {
        name: 'text with multiple ampersands and percent signs',
        text: 'Me&you in % ? You & me = 0%',
        expected: 'echo Me^&you in %% ? You ^& me = 0%%',
      },
      {
        name: 'operators inside double quotes, which cmd prints as they are',
        text: 'Remove "Movies & TV" app',
        expected: 'echo Remove "Movies & TV" app',
      },
      {
        name: 'redirection, pipe and caret outside double quotes',
        text: 'a < b > c | d ^ e',
        expected: 'echo a ^< b ^> c ^| d ^^ e',
      },
      {
        name: 'percent sign inside double quotes, which cmd still expands',
        text: 'Use "100%" of it',
        expected: 'echo Use "100%%" of it',
      },
    ];
    for (const test of testData) {
      it(test.name, () => {
        // arrange
        const sut = new BatchBuilderRevealer();
        // act
        const actual = sut.writeStandardOut(test.text);
        // assert
        expect(test.expected).to.equal(actual);
      });
    }
  });
  describe('getNewLineTerminator', () => {
    it('returns expected', () => {
      // arrange
      const expected = '\r\n';
      const sut = new BatchBuilderRevealer();
      // act
      const actual = sut.getNewLineTerminator();
      // assert
      expect(expected).to.equal(actual);
    });
  });
});
