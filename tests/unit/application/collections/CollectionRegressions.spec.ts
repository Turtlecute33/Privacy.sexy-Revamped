import { describe, expect, it } from 'vitest';
import { loadCollections } from '@/application/Application/Loader/Collections/CollectionsLoader';
import { OperatingSystem } from '@/domain/OperatingSystem';
import { RecommendationLevel } from '@/domain/Executables/Script/RecommendationLevel';
import type { Script } from '@/domain/Executables/Script/Script';
import { ProjectDetailsStub } from '@tests/unit/shared/Stubs/ProjectDetailsStub';
import { formatAssertionMessage } from '@tests/shared/FormatAssertionMessage';

/*
  These tests compile the real collection files and assert on the generated code.

  They exist because the defects they cover were all invisible at the YAML level: a template
  referenced an undeclared parameter, a stray escape character broke a command, and a string
  interpolation silently produced the wrong value. Only the compiled output reveals them.
*/

const collections = loadCollections(new ProjectDetailsStub());

function getScripts(os: OperatingSystem): readonly Script[] {
  const collection = collections.find((candidate) => candidate.os === os);
  if (!collection) {
    throw new Error(`Missing collection for ${OperatingSystem[os]}`);
  }
  return collection.actions.flatMap((action) => action.getAllScriptsRecursively());
}

function getScript(os: OperatingSystem, name: string): Script {
  const script = getScripts(os).find((candidate) => candidate.name === name);
  if (!script) {
    throw new Error(`Missing script "${name}" in ${OperatingSystem[os]}`);
  }
  return script;
}

describe('compiled collection regressions', () => {
  describe('Windows', () => {
    it('keeps the CPU vendor guards of the Spectre and Meltdown mitigation', () => {
      // `RunPowerShellWithOptionalElevation` used to read an undeclared `$setupCode`, which
      // silently dropped every caller-provided guard. Both vendor-specific values were then
      // written on every CPU, leaving Intel systems configured with the AMD value.
      const script = getScript(
        OperatingSystem.Windows,
        'Mitigate Spectre Variant 2 and Meltdown in host operating system',
      );

      const overrideWrites = script.code.execute
        .split('\n')
        .filter((line) => line.includes("/v 'FeatureSettingsOverride'"));

      expect(overrideWrites).to.have.lengthOf(2);
      expect(overrideWrites.every((line) => line.includes('Win32_Processor'))).to.equal(
        true,
        formatAssertionMessage(['A vendor guard is missing:', ...overrideWrites]),
      );
      expect(overrideWrites.filter((line) => line.includes("-NotMatch 'Intel'"))).to.have.lengthOf(1);
      expect(overrideWrites.filter((line) => line.includes("-NotMatch 'AMD'"))).to.have.lengthOf(1);
    });

    it('reverts removed Windows capabilities using the capability name', () => {
      // `"$capability.Name"` stringifies the object and appends a literal `.Name`, so every
      // capability removal was irreversible in practice.
      const script = getScript(OperatingSystem.Windows, 'Remove ".NET Framework" capability');

      expect(script.code.revert).to.include('$_.Name');
      expect(script.code.revert).to.not.include('"$capability.Name"');
    });

    it('adds a rule when blocking executables from running', () => {
      // A doubled backtick produced an unbindable argument, so `New-ItemProperty` always failed and
      // no `DisallowRun` rule was ever created.
      const scripts = getScripts(OperatingSystem.Windows)
        .filter((script) => script.code.execute.includes('DisallowRun'));

      expect(scripts.length).to.be.greaterThan(0);
      for (const script of scripts) {
        expect(script.code.execute).to.not.include(
          '` `',
          formatAssertionMessage([`Stray escape character in "${script.name}"`]),
        );
      }
    });

    it('offers the Defender-weakening scripts without recommending any of them', () => {
      // These scripts are deliberately available, but selecting a preset must never turn Defender
      // off on the user's behalf.
      const defenderScripts = getScripts(OperatingSystem.Windows)
        .filter((script) => {
          const code = script.code.execute + (script.code.revert ?? '');
          return code.includes('Set-MpPreference') || code.includes('WebThreatDefSvc');
        });

      expect(defenderScripts.length).to.be.greaterThan(0);

      const recommended = defenderScripts
        .filter((script) => script.level !== undefined)
        .map((script) => script.name);

      expect(recommended).to.deep.equal([], formatAssertionMessage([
        'A preset recommends turning off a Defender protection:',
        ...recommended,
      ]));
    });
  });

  describe('macOS', () => {
    it('configures the application firewall through socketfilterfw', () => {
      // `/Library/Preferences/com.apple.alf.plist` no longer exists on current macOS releases, and
      // `com.apple.security.firewall` is an MDM payload key rather than a preferences domain, so
      // both were silently ineffective.
      const allCode = getScripts(OperatingSystem.macOS)
        .map((script) => script.code.execute + (script.code.revert ?? ''))
        .join('\n');

      expect(allCode).to.not.include('com.apple.alf');
      expect(allCode).to.not.include('com.apple.security.firewall');

      const script = getScript(
        OperatingSystem.macOS,
        'Disable automatic incoming connections for signed apps',
      );
      expect(script.code.execute).to.include('socketfilterfw --setallowsigned off');
      expect(script.code.revert).to.include('socketfilterfw --setallowsigned on');
    });

    it('writes user preferences as the invoking user instead of as root', () => {
      // `defaults` resolves the preference domain from the effective user ID and ignores `$HOME`,
      // so running it as root would store the value in root's preferences.
      const script = getScript(OperatingSystem.macOS, 'Disable Spotlight lookup suggestions');

      expect(script.code.execute).to.include('run_as_target_user defaults write');
      expect(script.code.revert).to.include('run_as_target_user defaults write');
    });
  });

  describe('Linux', () => {
    it('disables Visual Studio Code automatic type acquisition', () => {
      // The script set the `disable...` setting to `false`, which enabled the feature it named.
      const script = getScript(
        OperatingSystem.Linux,
        'Disable Visual Studio Code automatic type acquisition in TypeScript',
      );

      expect(script.code.execute).to.include("target = json.loads('true')");
    });

    it('resolves the job name when re-enabling a disabled cron job', () => {
      // The revert code referenced `$job_name` without ever assigning it, so it always failed.
      const script = getScripts(OperatingSystem.Linux)
        .find((candidate) => candidate.code.revert?.includes('/etc/cron.daily/$job_name'));

      expect(script).to.not.equal(undefined);
      expect(script?.code.revert).to.match(/job_name='[^']+'/);
    });

    it('clears user-owned paths rather than filesystem-root paths', () => {
      const offenders = getScripts(OperatingSystem.Linux)
        .filter((script) => /rm -[rf]+v \/\.(cache|recently)/.test(script.code.execute))
        .map((script) => script.name);

      expect(offenders).to.deep.equal([]);
    });
  });

  describe('recommendation presets', () => {
    /*
      A user who applies a preset should be able to get back to where they started.

      Deleting data cannot be undone, so scripts that clear data are necessarily irreversible and
      are named accordingly. A script that *changes a setting* has no such excuse: if it is offered
      by a preset it must provide revert code, otherwise the user has no way back.
    */
    const dataRemovalNamePrefixes = ['Clear ', 'Empty ', 'Remove '];

    for (const os of [OperatingSystem.Windows, OperatingSystem.macOS, OperatingSystem.Linux]) {
      it(`${OperatingSystem[os]} recommends no irreversible configuration change`, () => {
        const offenders = getScripts(os)
          .filter((script) => script.level === RecommendationLevel.Standard
            || script.level === RecommendationLevel.Strict)
          .filter((script) => !script.canRevert())
          .filter((script) => !dataRemovalNamePrefixes.some(
            (prefix) => script.name.startsWith(prefix),
          ))
          .map((script) => script.name);

        expect(offenders).to.deep.equal([], formatAssertionMessage([
          'A preset recommends a script that changes a setting but cannot be reverted.',
          'Add revert code, or remove its `recommend` key:',
          ...offenders,
        ]));
      });
    }
  });
});
