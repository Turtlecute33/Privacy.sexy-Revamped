import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollections } from '@/application/Application/Loader/Collections/CollectionsLoader';
import { OperatingSystem } from '@/domain/OperatingSystem';
import { splitTextIntoLines } from '@/application/Common/Text/SplitTextIntoLines';
import { ProjectDetailsStub } from '@tests/unit/shared/Stubs/ProjectDetailsStub';
import { formatAssertionMessage } from '@tests/shared/FormatAssertionMessage';

/*
  Windows scripts run each PowerShell snippet as one `PowerShell -Command "..."` line, built by the
  `inlinePowerShell` and `escapeDoubleQuotes` pipes. A snippet that reads fine in the YAML can still
  produce a line PowerShell refuses to parse, and a parse error aborts the whole command before a
  single statement runs, so the script silently does nothing. These tests hand every generated
  command to the real PowerShell parser instead of guessing at the patterns that break it.

  They prefer Windows PowerShell 5.1 (`powershell.exe`), which is what the scripts run on, and fall
  back to PowerShell 7 (`pwsh`), which the macOS and Ubuntu CI runners ship. PowerShell 7 accepts a
  little more syntax than 5.1 (`&&`, `?:`, `??`), so only the Windows run is authoritative for that.
*/

const collections = loadCollections(new ProjectDetailsStub());

const POWERSHELL_COMMAND_LINE = /^\s*PowerShell\s.*?-Command\s+"(.*)"\s*$/i;

/*
  cmd expands `%NAME%` (including `%PROGRAMFILES(X86)%`) before PowerShell sees the command, and
  `%%` is how a batch file writes a literal `%`.
*/
const BATCH_PERCENT_TOKEN = /%%|%[A-Za-z_][A-Za-z0-9_]*(?:\([xX]86\))?%/g;

const EMBEDDED_RESOURCES_DIRECTORY = resolve('src/application/collections/resources/windows');

interface PowerShellSource {
  readonly label: string;
  readonly code: string;
}

function getInlineCommands(): PowerShellSource[] {
  const collection = collections.find((candidate) => candidate.os === OperatingSystem.Windows);
  if (!collection) {
    throw new Error('Missing collection for Windows');
  }
  return collection.getAllScripts().flatMap((script) => (
    (['execute', 'revert'] as const).flatMap((kind) => {
      const code = script.code[kind];
      if (!code) {
        return [];
      }
      return splitTextIntoLines(code)
        .map((line) => POWERSHELL_COMMAND_LINE.exec(line)?.[1])
        .filter((argument): argument is string => argument !== undefined)
        .map((argument, index) => ({
          label: `${script.name} (${kind}, command ${index + 1})`,
          code: argument.replaceAll('"^""', '"'),
        }));
    })
  ));
}

function getEmbeddedResources(): PowerShellSource[] {
  return readdirSync(EMBEDDED_RESOURCES_DIRECTORY)
    .filter((fileName) => fileName.endsWith('.ps1'))
    .map((fileName) => ({
      label: `resources/windows/${fileName}`,
      // A byte order mark is file metadata to PowerShell, but `ParseInput` would read it as code.
      code: readFileSync(join(EMBEDDED_RESOURCES_DIRECTORY, fileName), 'utf-8').replace(/^\uFEFF/, ''),
    }));
}

function expandBatchVariables(command: string): string {
  return command.replace(BATCH_PERCENT_TOKEN, (token) => (token === '%%' ? '%' : 'C:\\Windows'));
}

function findPowerShell(): string | undefined {
  return ['powershell.exe', 'pwsh'].find((executable) => {
    const result = spawnSync(executable, ['-NoProfile', '-NonInteractive', '-Command', 'exit 0'], {
      stdio: 'ignore',
      timeout: 30_000,
    });
    return result.status === 0;
  });
}

interface ParseErrorRecord {
  readonly index: number;
  readonly errorId: string;
  readonly offset: number;
}

function findParseErrors(executable: string, sources: readonly PowerShellSource[]): string[] {
  const directory = mkdtempSync(join(tmpdir(), 'privacy-sexy-powershell-syntax-'));
  try {
    const inputPath = join(directory, 'sources.json');
    const outputPath = join(directory, 'errors.json');
    writeFileSync(inputPath, JSON.stringify({ sources: sources.map((source) => source.code) }), 'utf-8');
    /*
      The parser script goes in as `-EncodedCommand` rather than a `.ps1` file, so an execution
      policy enforced by Group Policy cannot block it. Results come back as tab-separated lines of
      index, offset and error ID: messages are localized, and `ConvertTo-Json` in Windows
      PowerShell 5.1 throws on some array shapes.
    */
    const parserScript = `
      $sources = ([IO.File]::ReadAllText(${toPowerShellLiteral(inputPath)}) | ConvertFrom-Json).sources
      $records = New-Object System.Collections.Generic.List[string]
      for ($index = 0; $index -lt $sources.Count; $index++) {
        $tokens = $null
        $parseErrors = $null
        [void][System.Management.Automation.Language.Parser]::ParseInput($sources[$index], [ref] $tokens, [ref] $parseErrors)
        foreach ($parseError in $parseErrors) {
          $records.Add("$index\`t$($parseError.Extent.StartOffset)\`t$($parseError.ErrorId)")
        }
      }
      [IO.File]::WriteAllLines(${toPowerShellLiteral(outputPath)}, $records.ToArray())
    `;
    const result = spawnSync(executable, [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(parserScript, 'utf16le').toString('base64'),
    ], { encoding: 'utf-8', timeout: 120_000 });
    if (result.status !== 0) {
      throw new Error(`${executable} could not run the parser: ${result.error?.message ?? result.stderr}`);
    }
    return splitTextIntoLines(readFileSync(outputPath, 'utf-8').replace(/^\uFEFF/, ''))
      .filter((line) => line.length > 0)
      .map((line): ParseErrorRecord => {
        const [index, offset, errorId] = line.split('\t');
        return { index: Number(index), offset: Number(offset), errorId };
      })
      .map((record) => {
        const { label, code } = sources[record.index];
        const context = code.slice(Math.max(0, record.offset - 60), record.offset + 60);
        return `${label}: ${record.errorId} near \`${context}\``;
      });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function toPowerShellLiteral(text: string): string {
  return `'${text.replaceAll('\'', '\'\'')}'`;
}

describe('compiled PowerShell syntax', () => {
  const inlineCommands = getInlineCommands();

  it('finds the inline commands to check', () => {
    // Guards the extraction itself: if the generated command line changes shape, the checks below
    // would otherwise pass vacuously.
    expect(inlineCommands.length).to.be.greaterThan(1000);
  });

  it('leaves no percent sign for cmd to swallow', () => {
    /*
      Inside a batch file, cmd reads a lone `%` as the start of a variable reference and drops it
      along with the text up to the next `%`, so PowerShell receives different code than the YAML
      shows. Write `%%` for a literal percent sign.
    */
    const offenders = inlineCommands
      .filter((command) => command.code.replace(BATCH_PERCENT_TOKEN, '').includes('%'))
      .map((command) => command.label);

    expect(offenders).to.deep.equal([], formatAssertionMessage([
      'A PowerShell command contains a `%` that cmd will not pass through:',
      ...offenders,
    ]));
  });

  const powerShell = findPowerShell();

  it.skipIf(!powerShell)('parses every generated command and embedded script', () => {
    const sources = [
      ...inlineCommands.map((command) => ({
        ...command,
        code: expandBatchVariables(command.code),
      })),
      ...getEmbeddedResources(),
    ];

    const errors = findParseErrors(powerShell as string, sources);

    expect(errors).to.deep.equal([], formatAssertionMessage([
      `PowerShell (${powerShell}) cannot parse the generated code:`,
      ...errors,
    ]));
  }, 180_000);
});
