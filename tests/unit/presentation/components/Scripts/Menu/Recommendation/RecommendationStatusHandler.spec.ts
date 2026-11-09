import { describe, it, expect } from 'vitest';
import {
  type SelectionCheckContext, type SelectionMutationContext,
  getCurrentRecommendationStatus, setCurrentRecommendationStatus,
} from '@/presentation/components/Scripts/Menu/Recommendation/RecommendationStatusHandler';
import { RecommendationLevel } from '@/domain/Executables/Script/RecommendationLevel';
import type { ICategoryCollectionState } from '@/application/Context/State/ICategoryCollectionState';
import { EnumRangeTestRunner } from '@tests/unit/application/Common/EnumRangeTestRunner';
import type { ScriptSelection } from '@/application/Context/State/Selection/Script/ScriptSelection';
import type { MethodCall } from '@tests/unit/shared/Stubs/StubWithObservableMethodCalls';
import { expectExists } from '@tests/shared/Assertions/ExpectExists';
import { scrambledEqual } from '@/application/Common/Array';
import type { Script } from '@/domain/Executables/Script/Script';
import { RecommendationStatusType } from '@/presentation/components/Scripts/Menu/Recommendation/RecommendationStatusType';
import type { SelectedScript } from '@/application/Context/State/Selection/Script/SelectedScript';
import type { ScriptSelectionChangeCommand } from '@/application/Context/State/Selection/Script/ScriptSelectionChange';
import { SelectedScriptStub } from '@tests/unit/shared/Stubs/SelectedScriptStub';
import { RecommendationStatusTestScenario } from './RecommendationStatusTestScenario';

describe('RecommendationStatusHandler', () => {
  describe('setCurrentRecommendationStatus', () => {
    describe('throws with invalid type', () => {
      // arrange
      const scenario = new RecommendationStatusTestScenario();
      const { stateStub } = scenario.generateState([]);
      // act
      const act = (type: RecommendationStatusType) => setCurrentRecommendationStatus(
        type,
        createMutationContext(stateStub),
      );
      // assert
      new EnumRangeTestRunner(act)
        .testInvalidValueThrows(RecommendationStatusType.Custom, 'Cannot select custom type.')
        .testOutOfRangeThrows((value) => `Cannot handle the type: ${RecommendationStatusType[value]}`);
    });
    describe('select types as expected', () => {
      // arrange
      const scenario = new RecommendationStatusTestScenario();
      const testScenarios: ReadonlyArray<{
        readonly givenType: RecommendationStatusType;
        readonly expectedCall: MethodCall<ScriptSelection>;
      }> = [
        {
          givenType: RecommendationStatusType.None,
          expectedCall: {
            methodName: 'deselectAll',
            args: [],
          },
        },
        {
          givenType: RecommendationStatusType.Standard,
          expectedCall: {
            methodName: 'selectOnly',
            args: [
              scenario.allStandard.map((s) => s.script),
            ],
          },
        },
        {
          givenType: RecommendationStatusType.Strict,
          expectedCall: {
            methodName: 'selectOnly',
            args: [[
              ...scenario.allStandard.map((s) => s.script),
              ...scenario.allStrict.map((s) => s.script),
            ]],
          },
        },
        {
          givenType: RecommendationStatusType.All,
          expectedCall: {
            methodName: 'selectAll',
            args: [],
          },
        },
      ];
      testScenarios.forEach(({
        givenType, expectedCall,
      }) => {
        it(`${RecommendationStatusType[givenType]} modifies as expected`, () => {
          const { stateStub, scriptsStub } = scenario.generateState();
          // act
          setCurrentRecommendationStatus(givenType, createMutationContext(stateStub));
          // assert
          const call = scriptsStub.callHistory.find(
            (c) => c.methodName === expectedCall.methodName,
          );
          expectExists(call);
          if (expectedCall.args.length > 0) { /** {@link ScriptSelection.selectOnly}. */
            expect(scrambledEqual(
              call.args[0] as Script[],
              expectedCall.args[0] as Script[],
            )).to.equal(true);
          }
        });
      });
    });
    describe('applies the reverted scripts of the chosen preset', () => {
      // Otherwise the preset stays "Custom" no matter how often it is chosen.
      const scenario = new RecommendationStatusTestScenario();
      const testScenarios: ReadonlyArray<{
        readonly givenType: RecommendationStatusType;
        readonly revertedScript: SelectedScript;
      }> = [
        {
          givenType: RecommendationStatusType.Standard,
          revertedScript: asReverted(scenario.allStandard[0]),
        },
        {
          givenType: RecommendationStatusType.Strict,
          revertedScript: asReverted(scenario.allStrict[0]),
        },
        {
          givenType: RecommendationStatusType.All,
          revertedScript: asReverted(scenario.allUnrecommended[0]),
        },
      ];
      testScenarios.forEach(({ givenType, revertedScript }) => {
        it(RecommendationStatusType[givenType], () => {
          // arrange
          const { stateStub, scriptsStub } = scenario.generateState([revertedScript]);
          // act
          setCurrentRecommendationStatus(givenType, createMutationContext(stateStub));
          // assert
          const changes = scriptsStub.callHistory
            .filter((call) => call.methodName === 'processChanges')
            .flatMap((call) => (call.args[0] as ScriptSelectionChangeCommand).changes);
          expect(changes).to.deep.equal([{
            scriptId: revertedScript.id,
            newStatus: { isSelected: true, isReverted: false },
          }]);
        });
      });
      it('leaves reverted scripts outside the preset alone', () => {
        // arrange
        const revertedScript = asReverted(scenario.allUnrecommended[0]);
        const { stateStub, scriptsStub } = scenario.generateState([revertedScript]);
        // act
        setCurrentRecommendationStatus(
          RecommendationStatusType.Standard,
          createMutationContext(stateStub),
        );
        // assert
        expect(scriptsStub.callHistory.filter((call) => call.methodName === 'processChanges'))
          .to.have.lengthOf(0);
      });
    });
  });
  describe('getCurrentRecommendationStatus', () => {
    // arrange
    const scenario = new RecommendationStatusTestScenario();
    const testCases = [{
      name: 'when nothing is selected',
      selection: [],
      expected: RecommendationStatusType.None,
    }, {
      name: 'when some standard scripts are selected',
      selection: scenario.someStandard,
      expected: RecommendationStatusType.Custom,
    }, {
      name: 'when all standard scripts are selected',
      selection: scenario.allStandard,
      expected: RecommendationStatusType.Standard,
    }, {
      name: 'when all standard and some strict scripts are selected',
      selection: [...scenario.allStandard, ...scenario.someStrict],
      expected: RecommendationStatusType.Custom,
    }, {
      name: 'when all standard and strict scripts are selected',
      selection: [...scenario.allStandard, ...scenario.allStrict],
      expected: RecommendationStatusType.Strict,
    }, {
      name: 'when strict scripts are selected but not standard',
      selection: scenario.allStrict,
      expected: RecommendationStatusType.Custom,
    }, {
      name: 'when all standard and strict, and some unrecommended are selected',
      selection: [...scenario.allStandard, ...scenario.allStrict, ...scenario.someUnrecommended],
      expected: RecommendationStatusType.Custom,
    }, {
      name: 'when all scripts are selected',
      selection: scenario.all,
      expected: RecommendationStatusType.All,
    }, {
      name: 'when all scripts are selected but one is reverted',
      selection: [...scenario.all.slice(1), asReverted(scenario.all[0])],
      expected: RecommendationStatusType.Custom,
    }];
    for (const testCase of testCases) {
      it(testCase.name, () => {
        const { stateStub } = scenario.generateState(testCase.selection);
        // act
        const actual = getCurrentRecommendationStatus(createCheckContext(stateStub));
        // assert
        expect(actual).to.deep.equal(
          testCase.expected,
          `Actual: "${RecommendationStatusType[actual]}", expected: "${RecommendationStatusType[testCase.expected]}"`
            + `\nSelection: ${printSelection()}`,
        );
        function printSelection() {
          // eslint-disable-next-line prefer-template
          return `total: ${testCase.selection.length}\n`
            + 'scripts:\n'
            + testCase.selection
              .map((s) => `{ id: ${s.script.executableId}, level: ${s.script.level === undefined ? 'unknown' : RecommendationLevel[s.script.level]} }`)
              .join(' | ');
        }
      });
    }
  });
});

function createMutationContext(state: ICategoryCollectionState): SelectionMutationContext {
  return {
    selection: state.selection.scripts,
    collection: state.collection,
  };
}

function asReverted(selected: SelectedScript): SelectedScript {
  return new SelectedScriptStub(selected.script).withRevert(true);
}

function createCheckContext(state: ICategoryCollectionState): SelectionCheckContext {
  return {
    selection: state.selection.scripts,
    collection: state.collection,
  };
}
