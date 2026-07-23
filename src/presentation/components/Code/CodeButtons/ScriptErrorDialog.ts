import type { Dialog, SaveFileErrorType } from '@/presentation/common/Dialog';

type ErrorDialogParameters = Parameters<Dialog['showError']>;

export async function createScriptErrorDialog(
  information: ScriptErrorDetails,
): Promise<ErrorDialogParameters> {
  return createGenericErrorDialog(information);
}

export interface ScriptErrorDetails {
  readonly errorType: SaveFileErrorType;
  readonly errorMessage: string;
}

function createGenericErrorDialog(
  information: ScriptErrorDetails,
): ErrorDialogParameters {
  return [
    'Error Downloading Script',
    [
      'An error occurred while downloading the generated script.',
      '\n',
      generateUnorderedSolutionList({
        title: 'To address this, you can:',
        solutions: [
          'Check whether your browser blocked the download.',
          'Check that your download folder is writable and has enough free space.',
          'Try downloading a different script selection.',
          'If the problem persists, reach out to the community for further assistance.',
        ],
      }),
      '\n',
      generateTechnicalDetails(information),
    ].join('\n'),
  ];
}

interface SolutionListOptions {
  readonly solutions: readonly string[];
  readonly title: string;
}

function generateUnorderedSolutionList(options: SolutionListOptions) {
  return [
    options.title,
    ...options.solutions.map((step) => `- ${step}`),
  ].join('\n');
}

function generateTechnicalDetails(information: ScriptErrorDetails) {
  const maxErrorMessageCharacters = 100;
  const trimmedErrorMessage = information.errorMessage.length > maxErrorMessageCharacters
    ? `${information.errorMessage.substring(0, maxErrorMessageCharacters - 3)}...`
    : information.errorMessage;
  return `Technical Details: [${information.errorType}] ${trimmedErrorMessage}`;
}
