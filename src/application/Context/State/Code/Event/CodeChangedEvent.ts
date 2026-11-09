import type { Script } from '@/domain/Executables/Script/Script';
import type { ICodePosition } from '@/application/Context/State/Code/Position/ICodePosition';
import type { SelectedScript } from '@/application/Context/State/Selection/Script/SelectedScript';
import { splitTextIntoLines } from '@/application/Common/Text/SplitTextIntoLines';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import type { ICodeChangedEvent } from './ICodeChangedEvent';

export class CodeChangedEvent implements ICodeChangedEvent {
  public readonly code: string;

  public readonly addedScripts: ReadonlyArray<Script>;

  public readonly removedScripts: ReadonlyArray<Script>;

  public readonly changedScripts: ReadonlyArray<Script>;

  private readonly scripts: Map<Script, ICodePosition>;

  private positionsById: Map<ExecutableId, ICodePosition> | undefined;

  constructor(
    code: string,
    oldScripts: ReadonlyArray<SelectedScript>,
    scripts: Map<SelectedScript, ICodePosition>,
  ) {
    ensureAllPositionsExist(code, Array.from(scripts.values()));
    this.code = code;
    const newScripts = Array.from(scripts.keys());
    this.addedScripts = selectIfNotExists(newScripts, oldScripts);
    this.removedScripts = selectIfNotExists(oldScripts, newScripts);
    this.changedScripts = getChangedScripts(oldScripts, newScripts);
    this.scripts = new Map<Script, ICodePosition>();
    scripts.forEach((position, selection) => {
      this.scripts.set(selection.script, position);
    });
  }

  public isEmpty(): boolean {
    return this.scripts.size === 0;
  }

  public getScriptPositionInCode(script: Script): ICodePosition {
    return this.getPositionById(script.executableId);
  }

  private getPositionById(scriptId: ExecutableId): ICodePosition {
    /*
      Built on first use: highlighting asks for one position per added script, so scanning
      `scripts` on each call made selecting all 893 Windows scripts quadratic.
    */
    this.positionsById ??= new Map(
      [...this.scripts.entries()].map(([script, position]) => [script.executableId, position]),
    );
    const position = this.positionsById.get(scriptId);
    if (!position) {
      throw new Error('Unknown script: Position could not be found for the script');
    }
    return position;
  }
}

function ensureAllPositionsExist(script: string, positions: ReadonlyArray<ICodePosition>) {
  const totalLines = splitTextIntoLines(script).length;
  const missingPositions = positions.filter((position) => position.endLine > totalLines);
  if (missingPositions.length > 0) {
    throw new Error(
      `Out of range script end line: "${missingPositions.map((pos) => pos.endLine).join('", "')}"`
        + ` (total code lines: ${totalLines}).`,
    );
  }
}

function getChangedScripts(
  oldScripts: ReadonlyArray<SelectedScript>,
  newScripts: ReadonlyArray<SelectedScript>,
): ReadonlyArray<Script> {
  return newScripts
    .filter((newScript) => oldScripts.find((oldScript) => oldScript.id === newScript.id
      && oldScript.revert !== newScript.revert))
    .map((selection) => selection.script);
}

function selectIfNotExists(
  selectableContainer: ReadonlyArray<SelectedScript>,
  test: ReadonlyArray<SelectedScript>,
) {
  return selectableContainer
    .filter((script) => !test.find((oldScript) => oldScript.id === script.id))
    .map((selection) => selection.script);
}
