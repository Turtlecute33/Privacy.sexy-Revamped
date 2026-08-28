import type { ScriptCode } from '@/domain/Executables/Script/Code/ScriptCode';
import type { Script } from '@/domain/Executables/Script/Script';
import type { ScriptFactory, ScriptInitParameters } from '@/domain/Executables/Script/ScriptFactory';
import { ScriptStub } from './ScriptStub';

export function createScriptFactorySpy(): {
  readonly scriptFactorySpy: ScriptFactory;
  getInitParameters: (script: Script) => ScriptInitParameters | undefined;
  compileCode: (script: Script) => ScriptCode;
} {
  const createdScripts = new Map<Script, ScriptInitParameters>();
  return {
    scriptFactorySpy: (parameters) => {
      const script = new ScriptStub('script from factory stub');
      createdScripts.set(script, parameters);
      return script;
    },
    getInitParameters: (script) => createdScripts.get(script),
    /*
      `ScriptInitParameters.code` is a thunk that the real `createScript` only runs on first read of
      `Script.code`, and this spy returns a `ScriptStub` that never reads it. Tests asserting on the
      compiled code, or on the side effects of compiling (code validation), must run it themselves.
    */
    compileCode: (script) => {
      const parameters = createdScripts.get(script);
      if (!parameters) {
        throw new Error(`[${createScriptFactorySpy.name}] The script was not created by this spy.`);
      }
      return parameters.code();
    },
  };
}
