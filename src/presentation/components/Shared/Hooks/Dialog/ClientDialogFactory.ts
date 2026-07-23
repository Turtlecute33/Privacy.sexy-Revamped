import type { Dialog } from '@/presentation/common/Dialog';
import { BrowserDialog } from '@/infrastructure/Dialog/Browser/BrowserDialog';
import { decorateWithLogging } from '@/infrastructure/Dialog/LoggingDialogDecorator';
import { ClientLoggerFactory } from '../Log/ClientLoggerFactory';

export function createEnvironmentSpecificLoggedDialog(
  dialogLoggingDecorator: DialogLoggingDecorator = ClientLoggingDecorator,
  browserDialogFactory: BrowserDialogCreationFunction = () => new BrowserDialog(),
): Dialog {
  const dialog = browserDialogFactory();
  const loggingDialog = dialogLoggingDecorator(dialog);
  return loggingDialog;
}

export type BrowserDialogCreationFunction = () => Dialog;

export type DialogLoggingDecorator = (dialog: Dialog) => Dialog;

const ClientLoggingDecorator: DialogLoggingDecorator = (dialog) => decorateWithLogging(
  dialog,
  ClientLoggerFactory.Current.logger,
);
