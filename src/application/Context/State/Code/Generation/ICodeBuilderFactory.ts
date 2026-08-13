import type { ScriptLanguage } from '@/domain/ScriptMetadata/ScriptLanguage';
import type { ICodeBuilder } from './ICodeBuilder';

export interface ICodeBuilderFactory {
  create(language: ScriptLanguage): ICodeBuilder;
}
