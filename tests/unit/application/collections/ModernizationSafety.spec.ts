import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const collectionFiles = [
  'windows.yaml',
  'linux.yaml',
  'macos.yaml',
].map((fileName) => ({
  fileName,
  content: readFileSync(
    resolve('src/application/collections', fileName),
    'utf-8',
  ),
}));

describe('modernized collection safety boundaries', () => {
  it('does not offer actions that disable core update, authentication, recovery, or browser protections', () => {
    const forbiddenActionNames = [
      'Disable Edge and WebView2 automatic updates',
      'Disable Google background automatic updates',
      'Disable Adobe background automatic updates',
      'Disable Dropbox background automatic updates',
      'Disable Parallels Desktop automatic updates',
      'Disable Delivery Optimization service',
      'Disable Microsoft Account Sign-in Assistant',
      'Disable Shadow Copy',
      'Disable Firefox Phishing Protection',
      'Privacy over security',
    ];

    for (const { fileName, content } of collectionFiles) {
      for (const forbiddenActionName of forbiddenActionNames) {
        expect(
          content,
          `${fileName} contains unsafe action: ${forbiddenActionName}`,
        ).not.toContain(forbiddenActionName);
      }
    }
  });

  it('does not rely on removed Windows command-line or legacy Copilot policy surfaces', () => {
    const windowsCollection = getCollection('windows.yaml');

    expect(windowsCollection).not.toMatch(/\bwmic(?:\.exe)?\b/i);
    expect(windowsCollection).not.toContain('valueName: TurnOffWindowsCopilot');
    expect(windowsCollection).not.toContain(
      'keyPath: HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot',
    );
  });

  it('uses current Windows AI policies for Recall, Click to Do, and Copilot', () => {
    const windowsCollection = getCollection('windows.yaml');

    expect(windowsCollection).toContain('valueName: AllowRecallEnablement');
    expect(windowsCollection).toContain('valueName: DisableAIDataAnalysis');
    expect(windowsCollection).toContain('valueName: DisableClickToDo');
    expect(windowsCollection).toContain('valueName: RemoveMicrosoftCopilotApp');
    expect(windowsCollection).toContain(
      'keyPath: HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI',
    );
  });
});

function getCollection(fileName: string): string {
  const collection = collectionFiles.find((candidate) => candidate.fileName === fileName);
  if (!collection) {
    throw new Error(`Missing collection fixture: ${fileName}`);
  }
  return collection.content;
}
