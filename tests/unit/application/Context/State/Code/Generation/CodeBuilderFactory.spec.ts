import { describe, it, expect } from 'vitest';
import { ScriptLanguage } from '@/domain/ScriptMetadata/ScriptLanguage';
import { ShellBuilder } from '@/application/Context/State/Code/Generation/Languages/ShellBuilder';
import { BatchBuilder } from '@/application/Context/State/Code/Generation/Languages/BatchBuilder';
import { CodeBuilderFactory } from '@/application/Context/State/Code/Generation/CodeBuilderFactory';
import { getEnumValues } from '@/application/Common/Enum';

describe('CodeBuilderFactory', () => {
  describe('create', () => {
    interface TestCase {
      readonly language: ScriptLanguage;
      readonly expectedType: new () => unknown;
    }
    const testCases: readonly TestCase[] = [
      { language: ScriptLanguage.shellscript, expectedType: ShellBuilder },
      { language: ScriptLanguage.batchfile, expectedType: BatchBuilder },
    ];
    testCases.forEach(({ language, expectedType }) => {
      it(`returns ${expectedType.name} for ${ScriptLanguage[language]}`, () => {
        // arrange
        const sut = new CodeBuilderFactory();
        // act
        const actual = sut.create(language);
        // assert
        expect(actual).to.be.instanceOf(expectedType);
      });
    });
    it('covers every language', () => {
      // arrange
      const expectedLanguages = getEnumValues(ScriptLanguage);
      // act
      const actualLanguages = testCases.map((testCase) => testCase.language);
      // assert
      expect([...actualLanguages].sort()).to.deep.equal([...expectedLanguages].sort());
    });
    it('throws for an unknown language', () => {
      // arrange
      const unknownLanguage = -1 as ScriptLanguage;
      const sut = new CodeBuilderFactory();
      // act
      const act = (): unknown => sut.create(unknownLanguage);
      // assert
      expect(act).to.throw(RangeError);
    });
  });
});
