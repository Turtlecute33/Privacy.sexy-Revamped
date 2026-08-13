import { ScriptLanguage } from '@/domain/ScriptMetadata/ScriptLanguage';
import { BatchBuilder } from './Languages/BatchBuilder';
import { ShellBuilder } from './Languages/ShellBuilder';
import type { ICodeBuilder } from './ICodeBuilder';
import type { ICodeBuilderFactory } from './ICodeBuilderFactory';

export class CodeBuilderFactory implements ICodeBuilderFactory {
  public create(language: ScriptLanguage): ICodeBuilder {
    switch (language) {
      case ScriptLanguage.shellscript:
        return new ShellBuilder();
      case ScriptLanguage.batchfile:
        return new BatchBuilder();
      default:
        throw new RangeError(`Invalid language: "${ScriptLanguage[language]}"`);
    }
  }
}
