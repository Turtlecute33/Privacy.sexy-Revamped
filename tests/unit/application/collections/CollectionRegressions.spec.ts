import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

    it('embeds the complete GDID protection script in both opt-in actions', () => {
      const source = readFileSync(
        resolve('src/application/collections/resources/windows/degdid.ps1'),
        'utf8',
      );
      const scenarios = [
        {
          name: 'Block creation of Windows Global Device ID (breaks Microsoft account features)',
          arguments: '-Block',
        },
        {
          name: 'Remove Windows Global Device ID and block its recreation (breaks Microsoft account features)',
          arguments: '-Protect',
        },
      ];

      for (const scenario of scenarios) {
        const script = getScript(OperatingSystem.Windows, scenario.name);
        const executePayload = extractEmbeddedBase64Payload(script.code.execute);
        const revertPayload = extractEmbeddedBase64Payload(script.code.revert ?? '');

        expect(Buffer.from(executePayload, 'base64').toString('utf8')).to.equal(source);
        expect(Buffer.from(revertPayload, 'base64').toString('utf8')).to.equal(source);
        expect(script.code.execute).to.include(
          `-File "%privacy_sexy_embedded_script%" ${scenario.arguments}`,
        );
        expect(script.code.revert).to.include(
          '-File "%privacy_sexy_embedded_script%" -Unblock',
        );
        expect(script.level).to.equal(undefined);
      }
    });

    it('ignores absent GDID services but fails closed on other inventory errors', () => {
      const source = readFileSync(
        resolve('src/application/collections/resources/windows/degdid.ps1'),
        'utf8',
      );

      expect(source).to.include("@('wlidsvc', 'CDPSvc', 'TokenBroker', 'CDPUserSvc*')");
      expect(source).to.include("'CDPUserSvc*'");
      expect(source).to.match(
        /Get-Service -Name \$wanted -ErrorAction SilentlyContinue -ErrorVariable serviceErrors/,
      );
      expect(source).to.include(
        "Where-Object { $_.FullyQualifiedErrorId -notlike 'NoServiceFoundForGivenName*' }",
      );
      expect(source).to.include('Select-BlockingServiceError -ServiceErrors $serviceErrors');
      expect(source).to.include('if ($blocking.Count -gt 0)');
    });

    it('does not count uncorroborated OMADM placeholders as MDM enrollment', () => {
      const source = readFileSync(
        resolve('src/application/collections/resources/windows/degdid.ps1'),
        'utf8',
      );

      expect(source).to.include('function Test-RealMdmEnrollmentEntry');
      expect(source).to.include('if ($state -ne 1) { return $false }');
      expect(source).to.include('return [bool]$Upn -or [bool]$DiscoveryUrl');
      expect(source).to.include('function Select-CorroboratedOmadmAccount');
      expect(source).to.include('$n -and $real.ContainsKey($n)');
      expect(source).to.match(
        /Select-CorroboratedOmadmAccount\s+`\s+-OmadmAccountIds \$omadmIds\s+`\s+-RealEnrollmentIds @\(\$realEnrollmentIds\)/,
      );
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

    it('never writes a per-user preference domain as root', () => {
      /*
        This is the collection-wide version of the assertion above: the script runs as root, so any
        `defaults` call naming a preference domain (rather than an absolute plist path) has to go
        through `run_as_target_user`, or the value lands in root's preferences.
      */
      const domainCall = /\bdefaults\s+(?:write|delete)\s+('[^']*'|"[^"]*"|\S+)/g;
      const isPath = (domain: string): boolean => {
        const unquoted = domain.replace(/^['"]|['"]$/g, '');
        return unquoted.startsWith('/') || unquoted.startsWith('~') || unquoted.startsWith('$');
      };

      const offenders = getScripts(OperatingSystem.macOS).flatMap((script) => (
        (`${script.code.execute}\n${script.code.revert ?? ''}`)
          .split('\n')
          .filter((line) => !line.includes('run_as_target_user'))
          .flatMap((line) => Array.from(line.matchAll(domainCall), (match) => match[1]))
          .filter((domain) => !isPath(domain))
          .map((domain) => `${script.name}: ${domain}`)
      ));

      expect(offenders).to.deep.equal([], formatAssertionMessage([
        'A preference domain is written as root, so the value lands in root\'s preferences.',
        'Use `SetUserPreference` or wrap the command in `RunAsTargetUser`:',
        ...offenders,
      ]));
    });

    it('targets per-user launchctl domains with the invoking user instead of $UID', () => {
      // The script re-executes itself as root, so `$UID` is `0` and `user/$UID` / `gui/$UID`
      // address root's domains rather than the domains of the person running the script.
      const offenders = getScripts(OperatingSystem.macOS)
        .filter((script) => /(user|gui)\/\$UID/.test(script.code.execute + (script.code.revert ?? '')))
        .map((script) => script.name);

      expect(offenders).to.deep.equal([], formatAssertionMessage([
        'A per-user launchctl domain is addressed with $UID, which is root:',
        ...offenders,
      ]));
    });

    it('stops rather than starts the automatic reactivation of Gatekeeper', () => {
      // `GKAutoRearm` defaults to enabled, so writing `true` re-armed the 30-day timer that the
      // script promises to disable, and reverting turned it off.
      const script = getScript(OperatingSystem.macOS, "Disable Gatekeeper's automatic reactivation");

      expect(script.code.execute).to.include('GKAutoRearm -bool false');
      expect(script.code.revert).to.include('GKAutoRearm -bool true');
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

function extractEmbeddedBase64Payload(code: string): string {
  return Array.from(code.matchAll(/^\s*echo\(([A-Za-z0-9+/=]+)$/gm), (match) => match[1]).join('');
}
