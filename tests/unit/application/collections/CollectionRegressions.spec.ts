import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollections } from '@/application/Application/Loader/Collections/CollectionsLoader';
import { OperatingSystem } from '@/domain/OperatingSystem';
import { RecommendationLevel } from '@/domain/Executables/Script/RecommendationLevel';
import type { CategoryCollection } from '@/domain/Collection/CategoryCollection';
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
  it('compiles the code of every script', () => {
    /*
      Script code compiles on first read rather than during `loadCollections`, so a malformed
      script no longer breaks the shared load above. Instead, it breaks whenever a user first
      hovers over it, searches for it, or selects it, inside an already mounted app. Reading the
      code of every script is what keeps that failure in CI, where the other cases here only read
      the handful of scripts they name.
    */
    const failures = collections.flatMap((collection) => collection
      .getAllScripts()
      .flatMap((script) => describeCompilationFailure(collection, script)));

    expect(failures).to.deep.equal([], formatAssertionMessage([
      'A script does not compile:',
      ...failures,
    ]));
  });

  it('never ends the generated file from inside a selected script', () => {
    /*
      Every selected script is pasted inline into one file, so an `exit` in one of them ends the
      whole run: the scripts after it never run, and the Windows `pause` never shows the error
      before a double-clicked window closes. The embedded PowerShell runner and the macOS
      preference helper both did this on failure. Report the failure and carry on instead.
      PowerShell lines are excluded because `Exit` there only ends that PowerShell process.
    */
    const batchExit = /(^|[\s&|(])exit(\s|$)/i;
    const shellExit = /^(.*[;&|]\s*)?exit\b/;
    // Quoted text is not this shell's code, e.g. `awk '{ print $2; exit }'` only ends awk.
    const withoutQuotedText = (line: string) => line.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");
    const offenders = collections.flatMap((collection) => collection
      .getAllScripts()
      .flatMap((script) => (['execute', 'revert'] as const).flatMap((kind) => (
        (script.code[kind] ?? '')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => (collection.os === OperatingSystem.Windows
            ? !/^PowerShell\s/i.test(line) && batchExit.test(line)
            : shellExit.test(withoutQuotedText(line))))
          .map((line) => `${OperatingSystem[collection.os]}: ${script.name} (${kind}): ${line}`)
      ))));

    expect(offenders).to.deep.equal([], formatAssertionMessage([
      'A script ends the whole generated file:',
      ...offenders,
    ]));
  });

  it('passes file names to inline shell code as arguments, never inside the code', () => {
    /*
      `find -exec sh -c '... file="{}" ...' {} \;` pastes each file name into the code, which runs
      as root, so a downloaded file named `$(...).zip` ran its own commands. Pass it as `$1`
      instead: `-exec bash -c '... file="$1" ...' _ {} \;`.
    */
    const inlineShellCode = /\b(?:ba)?sh\s+-c[\s\\]*'([^']*)'/g;
    const offenders = collections
      .filter((collection) => collection.os !== OperatingSystem.Windows)
      .flatMap((collection) => collection.getAllScripts())
      .filter((script) => [script.code.execute, script.code.revert ?? '']
        .some((code) => [...code.matchAll(inlineShellCode)].some((match) => match[1].includes('{}'))))
      .map((script) => script.name);

    expect(offenders).to.deep.equal([]);
  });

  describe('Windows', () => {
    it('keeps every generated batch line within the cmd line-length limit', () => {
      /*
        cmd rejects a line longer than 8191 characters once `%VAR%` references are expanded ("The
        input line is too long."), so that command never runs. The longest generated lines are
        within a few dozen characters of the limit, so expansion is estimated with long but
        realistic values: a profile folder name of 32 characters and the longest program folder.
      */
      const maximumLineLength = 8191;
      const userProfileFolder = `C:\\Users\\${'u'.repeat(32)}\\AppData\\Local`;
      const expand = (line: string) => line
        .replace(/%(LOCALAPPDATA|APPDATA|USERPROFILE|TEMP|TMP)%/gi, userProfileFolder)
        .replace(/%[A-Za-z_]+(\(x86\))?%/gi, 'C:\\Program Files (x86)');
      const offenders = getScripts(OperatingSystem.Windows).flatMap((script) => (
        (['execute', 'revert'] as const).flatMap((kind) => (script.code[kind] ?? '')
          .split(/\r?\n/)
          .map((line) => expand(line).length)
          .filter((length) => length > maximumLineLength)
          .map((length) => `${script.name} (${kind}): ${length} characters`))
      ));

      expect(offenders).to.deep.equal([], formatAssertionMessage([
        `A generated line exceeds ${maximumLineLength} characters after expansion:`,
        ...offenders,
      ]));
    });

    it('opts out of Internet Explorer CEIP with the value the policy maps to "enabled"', () => {
      // inetres.admx maps the enabled "Prevent participation" policy to 0. Writing 1 allowed it.
      const script = getScript(
        OperatingSystem.Windows,
        'Disable Internet Explorer Customer Experience Improvement Program (CEIP) participation',
      );

      const write = script.code.execute
        .split('\n')
        .find((line) => line.includes("/v 'DisableCustomerImprovementProgram'"));

      expect(write).to.include("$data =  '0';");
    });

    it('writes User Configuration policies to the user hive', () => {
      // These ADMX policies are `class="User"`, so Windows only reads them from HKCU.
      const policies = [
        { script: 'Disable tailored experiences with diagnostic data', valueName: 'DisableTailoredExperiencesWithDiagnosticData' },
        { script: 'Disable Windows Spotlight (shows random wallpapers on lock screen)', valueName: 'DisableWindowsSpotlightFeatures' },
        { script: 'Disable local search history (breaks recent suggestions)', valueName: 'DisableSearchHistory' },
      ];
      for (const policy of policies) {
        const hkcuWrite = getScript(OperatingSystem.Windows, policy.script).code.execute
          .split('\n')
          .find((line) => line.includes(`'${policy.valueName}'`) && /HKCU\\Software\\Policies/i.test(line));

        expect(hkcuWrite, policy.script).to.not.equal(undefined);
      }
    });

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

      expect(script.code.revert).to.include('Add-WindowsCapability -Online -Name $capability.Name');
      expect(script.code.revert).to.not.include('"$capability.Name"');
    });

    it('keeps double quotes in registry string data', () => {
      // Windows PowerShell 5.1 passes `"` to reg.exe unescaped, which stripped them: the Outlook
      // block list was written as `[MS_Outlook]` instead of the JSON `["MS_Outlook"]`.
      const script = getScript(OperatingSystem.Windows, 'Disable Outlook automatic installation');

      expect(script.code.execute).to.include(
        "New-ItemProperty -LiteralPath $providerPath -Name 'BlockedOobeUpdaters'",
      );
    });

    it('re-adds only the capabilities that privacy.sexy removed', () => {
      // Revert used to add every capability matching the prefix, so reverting "Remove OpenSSH
      // Server" installed sshd on machines that never had it.
      const script = getScript(OperatingSystem.Windows, 'Remove ".NET Framework" capability');

      expect(script.code.execute).to.include("'privacy.sexy\\state\\capabilities'");
      expect(script.code.execute).to.include("Where-Object { \"^\"\"$($_.State)\"^\"\" -eq 'Installed' }");
      expect(script.code.execute).to.include('[IO.File]::WriteAllText($statePath, $capability.Name)');
      expect(script.code.revert).to.include('if (-Not (Test-Path -LiteralPath $statePath)) { continue; }');
    });

    it('restores optional features only when privacy.sexy disabled them', () => {
      const script = getScript(OperatingSystem.Windows, 'Disable "Telnet Client" feature');

      expect(script.code.execute).to.include("'privacy.sexy\\state\\features'");
      expect(script.code.execute).to.include('[IO.File]::WriteAllText($statePath, \'Enabled\')');
      expect(script.code.revert).to.include(
        'privacy.sexy did not disable feature',
      );
      expect(script.code.revert).to.include('Remove-Item -LiteralPath $statePath -Force');
      expect(script.code.revert).to.not.include('$disabledByDefault');
    });

    it('never splits a PowerShell call across lines inside its argument list', () => {
      /*
        The compiler joins every source line with `; `, so a call whose argument list opens at the
        end of a line becomes `Method(; $argument; )`, a parse error that aborts the whole
        `-Command` before a single statement runs. `DisableWindowsFeature` hit this and silently
        disabled nothing.

        `@(` and `$(` are exempt: they hold statement lists, so `@(; $item; )` and `$(; $item; )`
        parse, and the collection relies on the first. Keep such a call on one line, or continue
        it with a backtick. `CompiledPowerShellSyntax.spec.ts` checks the same output with the
        real parser wherever PowerShell is installed; this pattern keeps the most common case
        covered everywhere else.
      */
      const brokenCall = /(?<![@$])\(;/;
      const offenders = getScripts(OperatingSystem.Windows).flatMap((script) => (
        (['execute', 'revert'] as const)
          .map((kind) => ({ kind, code: script.code[kind] ?? '' }))
          .filter((candidate) => brokenCall.test(candidate.code))
          .map((candidate) => `${script.name} (${candidate.kind})`)
      ));

      expect(offenders).to.deep.equal([], formatAssertionMessage([
        'A call has its argument list broken across lines, so the generated code does not parse:',
        ...offenders,
      ]));
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

    it('embeds the state-preserving Paint AI policy script', () => {
      const source = readFileSync(
        resolve('src/application/collections/resources/windows/manage-paint-ai.ps1'),
        'utf8',
      );
      const script = getScript(OperatingSystem.Windows, 'Disable generative AI features in Paint');

      const executePayload = extractEmbeddedBase64Payload(script.code.execute);
      const revertPayload = extractEmbeddedBase64Payload(script.code.revert ?? '');

      expect(Buffer.from(executePayload, 'base64').toString('utf8')).to.equal(source);
      expect(Buffer.from(revertPayload, 'base64').toString('utf8')).to.equal(source);
      expect(script.code.execute).to.include('-Action Disable');
      expect(script.code.revert).to.include('-Action Restore');
      expect(source).to.include('$key.GetValueKind($Name)');
      expect(source).to.include('RegistryValueOptions]::DoNotExpandEnvironmentNames');
      expect(source).to.include('because it changed after privacy.sexy applied it');
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

    it('edits Visual Studio Code settings as the invoking user', () => {
      // As root, the helper created `~/.local/state/privacy.sexy` root-owned, so the user-level
      // Firefox scripts that run later could no longer record their own state there.
      const script = getScript(OperatingSystem.Linux, 'Disable Visual Studio Code telemetry');

      expect(script.code.execute).to.include('run_as_target_user python3 <<EOF');
      expect(script.code.revert).to.include('run_as_target_user python3 <<EOF');
    });

    it('removes pacman packages by exact name and without cascading to dependents', () => {
      const script = getScripts(OperatingSystem.Linux)
        .find((candidate) => candidate.code.execute.includes('sudo pacman -R'));

      expect(script?.code.execute).to.include('pacman -Q "$pkg_package_name"');
      expect(script?.code.execute).to.not.include('pacman -Qs');
      expect(script?.code.execute).to.include('sudo pacman -Rns ');
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

      Display names are not safety metadata. In particular, a `Clear`, `Empty`, or `Remove` prefix
      does not make deletion reversible, so no irreversible script belongs in a preset.
    */
    for (const os of [OperatingSystem.Windows, OperatingSystem.macOS, OperatingSystem.Linux]) {
      it(`${OperatingSystem[os]} recommends no irreversible action`, () => {
        const offenders = getScripts(os)
          .filter((script) => script.level === RecommendationLevel.Standard
            || script.level === RecommendationLevel.Strict)
          .filter((script) => !script.canRevert())
          .map((script) => script.name);

        expect(offenders).to.deep.equal([], formatAssertionMessage([
          'A preset recommends an action that cannot be reverted.',
          'Implement exact-state restoration, or remove its `recommend` key:',
          ...offenders,
        ]));
      });
    }

    it('does not recommend package or app removal', () => {
      const removalCommands = ['Remove-AppxPackage', 'apt-get purge', 'pacman -Rcns'];
      const offenders = [OperatingSystem.Windows, OperatingSystem.macOS, OperatingSystem.Linux]
        .flatMap((os) => getScripts(os))
        .filter((script) => script.level !== undefined)
        .filter((script) => removalCommands.some(
          (command) => script.code.execute.includes(command),
        ))
        .map((script) => script.name);

      expect(offenders).to.deep.equal([], formatAssertionMessage([
        'A preset recommends package or app removal, which cannot restore app data or provenance:',
        ...offenders,
      ]));
    });

    it('does not recommend non-stateful Windows task mutation', () => {
      const offenders = getScripts(OperatingSystem.Windows)
        .filter((script) => script.level !== undefined)
        .filter((script) => script.code.execute.includes('Disable-ScheduledTask'))
        .map((script) => script.name);

      expect(offenders).to.deep.equal([], formatAssertionMessage([
        'A preset recommends disabling a task without recording its prior state:',
        ...offenders,
      ]));
    });
  });
});

function describeCompilationFailure(
  collection: CategoryCollection,
  script: Script,
): readonly string[] {
  const location = `${OperatingSystem[collection.os]} > ${script.name}`;
  try {
    const { execute } = script.code;
    return execute.length > 0 ? [] : [`${location}: compiles to empty code`];
  } catch (error) {
    return [`${location}: ${error}`];
  }
}

function extractEmbeddedBase64Payload(code: string): string {
  return Array.from(code.matchAll(/^\s*echo\(([A-Za-z0-9+/=]+)$/gm), (match) => match[1]).join('');
}
