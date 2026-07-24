import type { UserSelection } from '@/application/Context/State/Selection/UserSelection';
import type { SelectedScript } from '@/application/Context/State/Selection/Script/SelectedScript';
import type { ExecutableId } from '@/domain/Executables/Identifiable';
import type { Reverter } from './Reverter';

export class ScriptReverter implements Reverter {
  constructor(private readonly scriptId: ExecutableId) {
  }

  public getState(selectedScripts: ReadonlyArray<SelectedScript>): boolean {
    const selectedScript = selectedScripts.find((selected) => selected.id === this.scriptId);
    if (!selectedScript) {
      return false;
    }
    return selectedScript.revert;
  }

  public selectWithRevertState(newState: boolean, selection: UserSelection): void {
    selection.scripts.processChanges({
      changes: [{
        scriptId: this.scriptId,
        newStatus: {
          isSelected: true,
          isReverted: newState,
        },
      }],
    });
  }
}
