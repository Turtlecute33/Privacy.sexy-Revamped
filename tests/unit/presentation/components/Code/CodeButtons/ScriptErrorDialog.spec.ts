import { describe, it, expect } from 'vitest';
import type { Dialog } from '@/presentation/common/Dialog';
import {
  type ScriptErrorDetails,
  createScriptErrorDialog,
} from '@/presentation/components/Code/CodeButtons/ScriptErrorDialog';
import { expectExists } from '@tests/shared/Assertions/ExpectExists';

describe('ScriptErrorDialog', () => {
  it('creates a download-specific error dialog', async () => {
    const details: ScriptErrorDetails = {
      errorType: 'DialogDisplayError',
      errorMessage: 'test error message',
    };

    const dialog = await createScriptErrorDialog(details);

    assertValidDialog(dialog);
    expect(dialog[0]).to.equal('Error Downloading Script');
    expect(dialog[1]).to.include('browser blocked the download');
  });
});

function assertValidDialog(dialog: Parameters<Dialog['showError']>): void {
  expectExists(dialog);
  const [title, message] = dialog;
  expectExists(title);
  expect(title).to.have.length.greaterThan(1);
  expectExists(message);
  expect(message).to.have.length.greaterThan(1);
}
