import { describe, it, expect } from 'vitest';
import { createScriptGroups } from '@/presentation/components/Scripts/View/Selection/Model/ScriptGroupFactory';
import { CategoryStub } from '@tests/unit/shared/Stubs/CategoryStub';
import { ScriptStub } from '@tests/unit/shared/Stubs/ScriptStub';

describe('ScriptGroupFactory', () => {
  describe('createScriptGroups', () => {
    it('reports whether a script can be reverted', () => {
      // arrange
      const reversibleScript = new ScriptStub('reversible').withReversibility(true);
      const irreversibleScript = new ScriptStub('irreversible').withReversibility(false);
      const root = new CategoryStub('root').withScripts(reversibleScript, irreversibleScript);
      // act
      const [group] = createScriptGroups([root], {});
      // assert
      const actual = group.scripts.map((script) => script.isReversible);
      expect(actual).to.deep.equal([true, false]);
    });

    /*
      Reading reversibility compiles the script's code, and groups cover a whole category before a
      single row renders. Copying it in compiled every script of the category inside the task that
      mounts the page.
    */
    it('does not read reversibility before it is asked for', () => {
      // arrange
      let readCount = 0;
      const script = new ScriptStub('script');
      script.canRevert = () => {
        readCount += 1;
        return true;
      };
      const root = new CategoryStub('root').withScripts(script);
      // act
      createScriptGroups([root], {});
      // assert
      expect(readCount).to.equal(0);
    });
  });
});
