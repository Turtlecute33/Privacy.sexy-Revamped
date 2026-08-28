import type { ScriptData, CodeScriptData, CallScriptData } from '@/application/collections/';
import { RecommendationLevel } from '@/domain/Executables/Script/RecommendationLevel';
import type { ScriptCode } from '@/domain/Executables/Script/Code/ScriptCode';
import { validateCode, type CodeValidator } from '@/application/Application/Loader/Collections/Compiler/Executable/Script/Validation/CodeValidator';
import { wrapErrorWithAdditionalContext, type ErrorWithContextWrapper } from '@/application/Application/Loader/Collections/Compiler/Common/ContextualError';
import type { ScriptCodeFactory } from '@/domain/Executables/Script/Code/ScriptCodeFactory';
import { createScriptCode } from '@/domain/Executables/Script/Code/ScriptCodeFactory';
import type { Script } from '@/domain/Executables/Script/Script';
import { createEnumParser, type EnumParser } from '@/application/Common/Enum';
import { filterEmptyStrings } from '@/application/Common/Text/FilterEmptyStrings';
import { createScript, type ScriptFactory } from '@/domain/Executables/Script/ScriptFactory';
import type { ScriptLanguage } from '@/domain/ScriptMetadata/ScriptLanguage';
import { CodeValidationRule } from '@/application/Application/Loader/Collections/Compiler/Executable/Script/Validation/CodeValidationRule';
import { parseDocs, type DocsParser } from '../DocumentationParser';
import { ExecutableType } from '../Validation/ExecutableType';
import { createExecutableDataValidator, type ExecutableValidator, type ExecutableValidatorFactory } from '../Validation/ExecutableValidator';
import type { CategoryCollectionContext } from '../CategoryCollectionContext';

export interface ScriptParser {
  (
    data: ScriptData,
    collectionContext: CategoryCollectionContext,
    scriptUtilities?: ScriptParserUtilities,
  ): Script;
}

const ParseFailureContext = 'Failed to parse script.';

export const parseScript: ScriptParser = (
  data,
  collectionContext,
  scriptUtilities = DefaultUtilities,
) => {
  const validator = scriptUtilities.createValidator({
    type: ExecutableType.Script,
    self: data,
  });
  validateScript(data, validator);
  try {
    const script = scriptUtilities.createScript({
      executableId: data.name, // Pseudo-ID for uniqueness until real ID support
      name: data.name,
      code: createCodeFactory(data, collectionContext, validator, scriptUtilities),
      docs: scriptUtilities.parseDocs(data),
      level: parseLevel(data.recommend, scriptUtilities.levelParser),
    });
    return script;
  } catch (error) {
    throw scriptUtilities.wrapError(
      error,
      validator.createContextualErrorMessage(ParseFailureContext),
    );
  }
};

/*
  Compilation is deferred to the first read of `Script.code` (see `ScriptFactory.ts`), so it no
  longer runs inside the `try` above and needs its own contextual wrapping to keep reporting which
  script failed. The message is built inside the `catch` rather than captured here, because the
  factory is created for all 1,163 scripts at load time and only a failing one ever needs it.
*/
function createCodeFactory(
  script: ScriptData,
  collectionContext: CategoryCollectionContext,
  validator: ExecutableValidator,
  scriptUtilities: ScriptParserUtilities,
): () => ScriptCode {
  return () => {
    try {
      return parseCode(
        script,
        collectionContext,
        scriptUtilities.codeValidator,
        scriptUtilities.createCode,
      );
    } catch (error) {
      throw scriptUtilities.wrapError(
        error,
        validator.createContextualErrorMessage(ParseFailureContext),
      );
    }
  };
}

function parseLevel(
  level: string | undefined,
  parser: EnumParser<RecommendationLevel>,
): RecommendationLevel | undefined {
  if (!level) {
    return undefined;
  }
  return parser.parseEnum(level, 'level');
}

function parseCode(
  script: ScriptData,
  collectionContext: CategoryCollectionContext,
  codeValidator: CodeValidator,
  createCode: ScriptCodeFactory,
): ScriptCode {
  if (collectionContext.compiler.canCompile(script)) {
    return collectionContext.compiler.compile(script);
  }
  const codeScript = script as CodeScriptData; // Must be inline code if it cannot be compiled
  const code = createCode(codeScript.code, codeScript.revertCode);
  validateHardcodedCodeWithoutCalls(code, codeValidator, collectionContext.language);
  return code;
}

function validateHardcodedCodeWithoutCalls(
  scriptCode: ScriptCode,
  validate: CodeValidator,
  language: ScriptLanguage,
) {
  filterEmptyStrings([scriptCode.execute, scriptCode.revert])
    .forEach(
      (code) => validate(
        code,
        language,
        [
          CodeValidationRule.NoEmptyLines,
          CodeValidationRule.NoDuplicatedLines,
          CodeValidationRule.NoTooLongLines,
          CodeValidationRule.NoCommentOnlyLines,
        ],
      ),
    );
}

function validateScript(
  script: ScriptData,
  validator: ExecutableValidator,
): asserts script is NonNullable<ScriptData> {
  validator.assertType((v) => v.assertObject<CallScriptData & CodeScriptData>({
    value: script,
    valueName: script.name ? `Script '${script.name}'` : 'Script',
    allowedProperties: [
      'name', 'recommend', 'code', 'revertCode', 'call', 'docs',
    ],
  }));
  validator.assertValidName(script.name);
  validator.assert(
    () => Boolean((script as CodeScriptData).code || (script as CallScriptData).call),
    'Neither "call" or "code" is defined.',
  );
  validator.assert(
    () => !((script as CodeScriptData).code && (script as CallScriptData).call),
    'Both "call" and "code" are defined.',
  );
  validator.assert(
    () => !((script as CodeScriptData).revertCode && (script as CallScriptData).call),
    'Both "call" and "revertCode" are defined.',
  );
}

interface ScriptParserUtilities {
  readonly levelParser: EnumParser<RecommendationLevel>;
  readonly createScript: ScriptFactory;
  readonly codeValidator: CodeValidator;
  readonly wrapError: ErrorWithContextWrapper;
  readonly createValidator: ExecutableValidatorFactory;
  readonly createCode: ScriptCodeFactory;
  readonly parseDocs: DocsParser;
}

const DefaultUtilities: ScriptParserUtilities = {
  levelParser: createEnumParser(RecommendationLevel),
  createScript,
  codeValidator: validateCode,
  wrapError: wrapErrorWithAdditionalContext,
  createValidator: createExecutableDataValidator,
  createCode: createScriptCode,
  parseDocs,
};
