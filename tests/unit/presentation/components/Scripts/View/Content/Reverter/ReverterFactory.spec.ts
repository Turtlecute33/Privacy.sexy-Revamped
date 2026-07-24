import { describe, it, expect } from 'vitest';
import { getReverter } from '@/presentation/components/Scripts/View/Content/Reverter/ReverterFactory';
import { ScriptReverter } from '@/presentation/components/Scripts/View/Content/Reverter/ScriptReverter';
import { CategoryReverter } from '@/presentation/components/Scripts/View/Content/Reverter/CategoryReverter';
import { CategoryCollectionStub } from '@tests/unit/shared/Stubs/CategoryCollectionStub';
import { CategoryStub } from '@tests/unit/shared/Stubs/CategoryStub';
import { ScriptStub } from '@tests/unit/shared/Stubs/ScriptStub';
import { type NodeMetadata, NodeType } from '@/presentation/components/Scripts/View/Content/NodeMetadata';
import type { ExecutableId } from '@/domain/Executables/Identifiable';

describe('ReverterFactory', () => {
  describe('getReverter', () => {
    it(`gets ${CategoryReverter.name} for category node`, () => {
      // arrange
      const category = new CategoryStub('test-action-category').withScriptIds('55');
      const node = getNodeContentStub(category.executableId, NodeType.Category);
      const collection = new CategoryCollectionStub()
        .withAction(category);
      // act
      const result = getReverter(node, collection);
      // assert
      expect(result instanceof CategoryReverter).to.equal(true);
    });
    it(`gets ${ScriptReverter.name} for script node`, () => {
      // arrange
      const script = new ScriptStub('test');
      const node = getNodeContentStub(script.executableId, NodeType.Script);
      const collection = new CategoryCollectionStub()
        .withAction(new CategoryStub('test-action-category').withScript(script));
      // act
      const result = getReverter(node, collection);
      // assert
      expect(result instanceof ScriptReverter).to.equal(true);
    });
  });
  function getNodeContentStub(executableId: ExecutableId, type: NodeType): NodeMetadata {
    return {
      executableId,
      text: 'text',
      isReversible: false,
      docs: [],
      children: [],
      type,
    };
  }
});
