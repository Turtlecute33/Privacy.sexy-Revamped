import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollections } from '@/application/Application/Loader/Collections/CollectionsLoader';
import { OperatingSystem } from '@/domain/OperatingSystem';
import type { Category } from '@/domain/Executables/Category/Category';
import type { Script } from '@/domain/Executables/Script/Script';
import { ProjectDetailsStub } from '@tests/unit/shared/Stubs/ProjectDetailsStub';
import { formatAssertionMessage } from '@tests/shared/FormatAssertionMessage';

/*
  This collection keeps the scripts that weaken a security control, but never recommends them.

  Turning off Defender, SmartScreen, Gatekeeper, code-signing enforcement or automatic updates is a
  real privacy trade-off that some users want to make deliberately. What none of them should be is
  a side effect of clicking "Standard" or "Strict", so every script underneath the categories below
  must be opt-in: no `recommend` key at all.
*/

const collections = loadCollections(new ProjectDetailsStub());

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

const optInOnlyCategories: Readonly<Record<number, readonly string[]>> = {
  [OperatingSystem.Windows]: [
    'Privacy over security',
    'Disable Edge and WebView2 automatic updates',
    'Disable Google background automatic updates',
    'Disable Adobe background automatic updates',
    'Disable Dropbox background automatic updates',
    'Disable connectivity checks',
    'Disable Windows Global Device ID',
  ],
  [OperatingSystem.macOS]: [
    'Privacy over security',
  ],
  [OperatingSystem.Linux]: [
    'Disable Firefox Phishing Protection (Safe Browsing) (decreases security)',
    'Configure auto-update settings for Visual Studio Code extensions',
  ],
};

function getCategories(os: OperatingSystem): readonly Category[] {
  const collection = collections.find((candidate) => candidate.os === os);
  if (!collection) {
    throw new Error(`Missing collection for ${OperatingSystem[os]}`);
  }
  const flatten = (category: Category): Category[] => [
    category,
    ...category.subcategories.flatMap(flatten),
  ];
  return collection.actions.flatMap(flatten);
}

function findCategory(os: OperatingSystem, name: string): Category {
  const matches = getCategories(os).filter((candidate) => candidate.name === name);
  if (matches.length !== 1) {
    throw new Error(`Expected one "${name}" category in ${OperatingSystem[os]}, found ${matches.length}`);
  }
  return matches[0];
}

function getCollection(fileName: string): string {
  const collection = collectionFiles.find((candidate) => candidate.fileName === fileName);
  if (!collection) {
    throw new Error(`Missing collection fixture: ${fileName}`);
  }
  return collection.content;
}

describe('modernized collection safety boundaries', () => {
  describe('security trade-offs stay out of the recommendation presets', () => {
    for (const [os, categoryNames] of Object.entries(optInOnlyCategories)) {
      for (const categoryName of categoryNames) {
        it(`"${categoryName}" in ${OperatingSystem[Number(os)]}`, () => {
          const category = findCategory(Number(os), categoryName);
          const scripts = category.getAllScriptsRecursively();

          expect(scripts.length).to.be.greaterThan(
            0,
            formatAssertionMessage([`"${categoryName}" no longer offers any script.`]),
          );

          const recommended = scripts
            .filter((script: Script) => script.level !== undefined)
            .map((script: Script) => script.name);

          expect(recommended).to.deep.equal([], formatAssertionMessage([
            `"${categoryName}" weakens a security control, so it must not be part of a preset.`,
            'Remove the `recommend` key from:',
            ...recommended,
          ]));
        });
      }
    }
  });

  it('keeps LLMNR disabling out of presets because it can break local hostname resolution', () => {
    const scripts = getCategories(OperatingSystem.Windows)
      .flatMap((category) => category.scripts)
      .filter((script) => script.name === 'Disable insecure "LLMNR" protocol');

    expect(scripts.length).to.equal(1);
    expect(scripts[0].level).to.equal(undefined, formatAssertionMessage([
      'Disabling LLMNR can make local resources inaccessible by hostname when DNS is unavailable.',
      'Keep this security and compatibility trade-off opt-in.',
    ]));
  });

  it('does not recommend removing the apps that sign-in and biometrics depend on', () => {
    // Uninstalling these leaves the user unable to authenticate, which is not a trade-off a
    // preset gets to make for them.
    const authenticationApps = [
      'Remove "Microsoft AAD Broker Plugin" app (breaks Night Light settings, taskbar keyboard selection and Office app authentication)',
      'Remove "Hello setup UI" app (breaks biometric authentication)',
      'Remove "Credentials Dialog Host" app',
      'Remove "Cloud Experience Host" app (breaks Windows Hello password/PIN sign-in options, and Microsoft cloud/corporate sign in)',
      'Disable Microsoft Account Sign-in Assistant (breaks Microsoft Store and Microsoft Account sign-in)',
      'Disable Shadow Copy (breaks System Restore and Windows Backup)',
    ];
    const scripts = getCategories(OperatingSystem.Windows)
      .flatMap((category) => category.scripts)
      .filter((script) => authenticationApps.includes(script.name));

    expect(scripts.map((script) => script.name).sort())
      .to.deep.equal([...authenticationApps].sort());

    const recommended = scripts
      .filter((script: Script) => script.level !== undefined)
      .map((script: Script) => script.name);

    expect(recommended).to.deep.equal([], formatAssertionMessage([
      'A preset recommends removing an authentication or recovery component:',
      ...recommended,
    ]));
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

  it('does not retain scripts whose target product no longer ships', () => {
    const discontinuedTargets = [
      'Disable outdated Edge metrics data sending',
      'Disable outdated Edge site information sending',
      'Disable outdated Edge automatic image enhancement',
      'Disable Edge (Legacy) Live Tile data collection',
      'Disable Edge (Legacy) search suggestions',
      'Disable Edge (Legacy) Books telemetry',
      'Clear Flash Player traces',
    ];
    const scripts = getCategories(OperatingSystem.Windows)
      .flatMap((category) => category.scripts);

    for (const name of discontinuedTargets) {
      const script = scripts.find((candidate: Script) => candidate.name === name);
      expect(script, `Discontinued script is still present: "${name}"`).to.equal(undefined);
    }
  });

  it('does not reintroduce cleanup scripts for the removed desktop application', () => {
    for (const { fileName, content } of collectionFiles) {
      expect(
        content,
        `${fileName} clears data that only the removed desktop app wrote`,
      ).not.toContain('Clear privacy.sexy data');
    }
  });
});
