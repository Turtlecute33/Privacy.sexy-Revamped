import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test, expect } from 'vitest';
import { loadApplicationComposite } from '@/application/Application/Loader/CompositeApplicationLoader';
import { UserScriptGenerator } from '@/application/Context/State/Code/Generation/UserScriptGenerator';
import { UserSelectedScript } from '@/application/Context/State/Selection/Script/UserSelectedScript';
import { OperatingSystem } from '@/domain/OperatingSystem';
import { RecommendationLevel } from '@/domain/Executables/Script/RecommendationLevel';
import type { Category } from '@/domain/Executables/Category/Category';
import type { Script } from '@/domain/Executables/Script/Script';

/*
  Writes every Windows script as the batch file the site would hand a visitor who selected only
  that script: once to apply it and, when it is reversible, once to revert it. `run.ps1` then runs
  those files on a disposable Windows machine (see `checks.windows-scripts` workflow).

  The files come from the same generator the site uses, so the start and end code, the per-script
  header and the line endings are the ones a visitor gets.
*/

const outputDirectory = resolve(process.env.WINDOWS_SCRIPTS_DIR ?? 'dist-windows-scripts');

interface ManifestEntry {
  readonly index: number;
  readonly id: string;
  readonly name: string;
  readonly path: readonly string[];
  readonly level: string | null;
  readonly reversible: boolean;
  readonly registryKeys: readonly string[];
}

test('writes one apply and one revert file per Windows script', () => {
  // arrange
  const collection = loadApplicationComposite().getCollection(OperatingSystem.Windows);
  const generator = new UserScriptGenerator();
  const scriptsDirectory = join(outputDirectory, 'scripts');
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(scriptsDirectory, { recursive: true });
  // act
  const manifest = listScriptsWithPaths(collection.actions).map(({ script, path }, position) => {
    const index = position + 1;
    const fileName = (kind: string) => `${String(index).padStart(4, '0')}.${kind}.bat`;
    const build = (revert: boolean) => generator.buildCode(
      [new UserSelectedScript(script, revert)],
      collection.scriptMetadata,
    ).code;
    const applyCode = build(false);
    writeFileSync(join(scriptsDirectory, fileName('apply')), applyCode, 'utf-8');
    const revertCode = script.canRevert() ? build(true) : '';
    if (revertCode) {
      writeFileSync(join(scriptsDirectory, fileName('revert')), revertCode, 'utf-8');
    }
    return {
      index,
      id: script.executableId,
      name: script.name,
      path,
      level: script.level === undefined ? null : RecommendationLevel[script.level],
      reversible: script.canRevert(),
      registryKeys: extractRegistryKeys(`${applyCode}\n${revertCode}`),
    } satisfies ManifestEntry;
  });
  writeFileSync(join(outputDirectory, 'manifest.json'), JSON.stringify(manifest), 'utf-8');
  // assert
  expect(manifest.length).to.be.greaterThan(0);
});

function listScriptsWithPaths(
  categories: readonly Category[],
  parentPath: readonly string[] = [],
): { script: Script, path: readonly string[] }[] {
  return categories.flatMap((category) => {
    const path = [...parentPath, category.name];
    return [
      ...category.scripts.map((script) => ({ script, path })),
      ...listScriptsWithPaths(category.subcategories, path),
    ];
  });
}

const RegistryHives: Readonly<Record<string, string>> = {
  HKLM: 'HKLM',
  HKEY_LOCAL_MACHINE: 'HKLM',
  HKCU: 'HKCU',
  HKEY_CURRENT_USER: 'HKCU',
  HKCR: 'HKCR',
  HKEY_CLASSES_ROOT: 'HKCR',
  HKU: 'HKU',
  HKEY_USERS: 'HKU',
};

/*
  Lists the registry keys a script names, so the runner can record them before and after each
  run. A path that continues into a PowerShell variable or a wildcard is cut at the last complete
  key, which still shows whether its subkeys appeared or disappeared.
*/
function extractRegistryKeys(code: string): string[] {
  const pattern = /\b(HKLM|HKCU|HKCR|HKU|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKEY_CLASSES_ROOT|HKEY_USERS):?\\([^'"^!|;,`<>%\r\n]*)/g;
  const keys = new Set<string>();
  for (const match of code.matchAll(pattern)) {
    const hive = RegistryHives[match[1]];
    let subKey = cutAtUnopenedParenthesis(match[2]);
    const dynamicPart = subKey.search(/[$*?]/);
    if (dynamicPart !== -1) {
      subKey = subKey.slice(0, subKey.lastIndexOf('\\', dynamicPart) + 1);
    }
    subKey = subKey.replace(/\\+/g, '\\').replace(/[\\\s]+$/, '');
    if (subKey.length > 0) {
      keys.add(`${hive}\\${subKey}`);
    }
  }
  return [...keys].sort();
}

/*
  `(Get-ItemProperty HKLM:\Key).Value` ends the path at the `)`, while a key name such as
  `Shared Tools (x86)` keeps its own pair.
*/
function cutAtUnopenedParenthesis(path: string): string {
  let depth = 0;
  for (let index = 0; index < path.length; index++) {
    if (path[index] === '(') {
      depth++;
    } else if (path[index] === ')') {
      if (depth === 0) {
        return path.slice(0, index);
      }
      depth--;
    }
  }
  return path;
}
