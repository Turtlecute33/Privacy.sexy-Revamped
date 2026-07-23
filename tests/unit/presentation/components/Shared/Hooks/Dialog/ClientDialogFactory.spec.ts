import { describe, it, expect } from 'vitest';
import {
  createEnvironmentSpecificLoggedDialog,
  type BrowserDialogCreationFunction,
  type DialogLoggingDecorator,
} from '@/presentation/components/Shared/Hooks/Dialog/ClientDialogFactory';
import { DialogStub } from '@tests/unit/shared/Stubs/DialogStub';
import type { Dialog } from '@/presentation/common/Dialog';

describe('ClientDialogFactory', () => {
  it('creates a browser dialog', () => {
    const expectedDialog = new DialogStub();
    const browserFactory: BrowserDialogCreationFunction = () => expectedDialog;

    const actualDialog = createEnvironmentSpecificLoggedDialog(
      (dialog) => dialog,
      browserFactory,
    );

    expect(actualDialog).to.equal(expectedDialog);
  });

  it('decorates the browser dialog with logging', () => {
    const browserDialog = new DialogStub();
    const decoratedDialog = new DialogStub();
    let actualDecoratedDialog: Dialog | undefined;
    const decorator: DialogLoggingDecorator = (dialog) => {
      actualDecoratedDialog = dialog;
      return decoratedDialog;
    };

    const actualDialog = createEnvironmentSpecificLoggedDialog(
      decorator,
      () => browserDialog,
    );

    expect(actualDecoratedDialog).to.equal(browserDialog);
    expect(actualDialog).to.equal(decoratedDialog);
  });
});
