import type { Dialog } from '@/presentation/common/Dialog';
import { createEnvironmentSpecificLoggedDialog } from './ClientDialogFactory';

export function useDialog(
  factory: DialogFactory = () => createEnvironmentSpecificLoggedDialog(),
) {
  const dialog = factory();
  return {
    dialog,
  };
}

export type DialogFactory = () => Dialog;
