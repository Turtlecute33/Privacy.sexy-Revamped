import { describe, expect, it } from 'vitest';
import { loadCollections } from '@/application/Application/Loader/Collections/CollectionsLoader';
import { OperatingSystem } from '@/domain/OperatingSystem';
import type { Script } from '@/domain/Executables/Script/Script';
import { ProjectDetailsStub } from '@tests/unit/shared/Stubs/ProjectDetailsStub';
import { formatAssertionMessage } from '@tests/shared/FormatAssertionMessage';

/*
  These tests compile the real macOS and Linux collections and assert on the generated code.

  The generated script runs as root on the user's machine, with `HOME` pointing at the invoking
  user's home. Each case below covers a script that was unsafe or wrong in that setting: a path
  that split on spaces inside `rm -rf`, a user-writable tool executed with administrator rights,
  or a revert that switched a feature on even though it had been off before privacy.sexy ran.
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

function getLines(code: string | undefined): string[] {
  return (code ?? '').split(/\r?\n/).map((line) => line.trim());
}

function getRevert(script: Script): string {
  const { revert } = script.code;
  if (revert === undefined) {
    throw new Error(`"${script.name}" has no revert code`);
  }
  return revert;
}

function expectInOrder(code: string, snippets: readonly string[], context: string): void {
  let position = -1;
  for (const snippet of snippets) {
    const next = code.indexOf(snippet, position + 1);
    expect(next, formatAssertionMessage([
      `${context}: expected "${snippet}" after the previous snippet.`,
      ...snippets,
    ])).to.be.greaterThan(position);
    position = next;
  }
}

describe('compiled Unix collection safety', () => {
  describe('macOS', () => {
    describe('DeleteGlob', () => {
      const deletingScripts = () => getScripts(OperatingSystem.macOS)
        .filter((script) => script.code.execute.includes('glob_pattern='));

      it('never word-splits the expanded path inside `rm`', () => {
        /*
          `rm -rfv $glob_pattern` ran unquoted as root. With `glob_pattern="$HOME/Library/Logs/*"`
          and a home such as `/Users/Jane Doe`, `rm -rf` received `/Users/Jane` and
          `Doe/Library/Logs/*` as separate targets. The directory part must stay quoted, only the
          last component may be expanded, and that expansion must not split on spaces.
        */
        const scripts = deletingScripts();
        expect(scripts.length).to.be.greaterThan(0);
        for (const script of scripts) {
          const { execute } = script.code;
          expect(execute, script.name).to.not.match(/\brm\b[^\n]*\s\$glob_pattern\b/);
          expect(execute, script.name).to.include('for glob_match in "$glob_directory"/$glob_name; do');
          expect(execute, script.name).to.include("IFS=''");
          expect(execute, script.name).to.include('shopt -s nullglob');
          expect(execute, script.name).to.match(/\brm -r?fv -- "\$\{glob_matches\[@\]\}"/);
          // A `with` block trims its own whitespace, which once glued `sudo` to `rm`.
          expect(execute, script.name).to.not.include('sudorm');
        }
      });

      it('only uses a pattern in the last path component', () => {
        // The directory part is quoted, so a pattern there would silently match nothing.
        const offenders = deletingScripts().flatMap((script) => getLines(script.code.execute)
          .filter((line) => line.startsWith('glob_pattern="'))
          .map((line) => line.slice('glob_pattern="'.length, -1))
          .filter((pattern) => /[*?[]/.test(pattern.slice(0, pattern.lastIndexOf('/'))))
          .map((pattern) => `${script.name}: ${pattern}`));

        expect(offenders).to.deep.equal([]);
      });

      it('keeps user log clearing scoped to the home directory', () => {
        const { execute } = getScript(OperatingSystem.macOS, 'Clear user application logs').code;

        expect(execute).to.include('glob_pattern="$HOME/Library/Logs/*"');
        expect(execute).to.match(/\brm -rfv -- "\$\{glob_matches\[@\]\}"/);
        expect(execute).to.not.include('sudo rm');
      });
    });

    describe('user-owned developer tools', () => {
      /*
        These tools are found through the user's `PATH` and usually live in user-writable locations
        (Homebrew prefixes, `~/.npm-global`, `~/Library`). Running them as root let anything that
        replaced one of them run with administrator rights, so they must only ever run through
        `run_as_target_user`, as "Clear Homebrew cache" already did.
      */
      const tools = [
        { script: 'Clear Composer cache', command: 'composer clearcache', lookup: 'composer' },
        { script: 'Clear old Ruby gem versions', command: 'gem cleanup', lookup: 'gem' },
        { script: 'Clear unused Docker data', command: 'docker system prune -af', lookup: 'docker' },
        { script: 'Clear NPM cache', command: 'npm cache clean --force', lookup: 'npm' },
        { script: 'Clear Yarn cache', command: 'yarn cache clean --force', lookup: 'yarn' },
      ];
      for (const tool of tools) {
        it(`runs "${tool.command}" as the invoking user`, () => {
          const lines = getLines(getScript(OperatingSystem.macOS, tool.script).code.execute);
          const invocations = lines.filter((line) => line.includes(tool.command));
          const lookups = lines.filter((line) => new RegExp(`\\btype\\s+"?${tool.lookup}\\b`).test(line));

          expect(invocations.length, tool.script).to.be.greaterThan(0);
          expect(lookups.length, tool.script).to.be.greaterThan(0);
          for (const line of [...invocations, ...lookups]) {
            expect(line, tool.script).to.include(`run_as_target_user ${line.includes('type ') ? 'type' : tool.command.split(' ')[0]}`);
          }
        });
      }

      it('clears the default pyenv cache as the invoking user', () => {
        // `PYENV_VIRTUALENV_CACHE_PATH` never reaches the root shell (sudo resets the environment),
        // so the old script never ran; when set, it would also have been expanded unquoted as root.
        const { execute } = getScript(OperatingSystem.macOS, 'Clear Pyenv-Virtualenv cache').code;

        expect(execute).to.not.include('PYENV_VIRTUALENV_CACHE_PATH');
        expect(execute).to.include('pyenv_cache_directory="$target_home/.pyenv/cache"');
        expect(execute).to.include('run_as_target_user find "$pyenv_cache_directory" -mindepth 1 -maxdepth 1');
      });

      it('runs the per-user Google Software Update uninstaller as the user, quoted', () => {
        // `ksinstall` lives in the user-writable `~/Library` and was executed unquoted as root.
        const { execute } = getScript(OperatingSystem.macOS, 'Remove Google Software Update service').code;

        expect(execute).to.include(
          'google_update_tool="$HOME/Library/Google/GoogleSoftwareUpdate/GoogleSoftwareUpdate.bundle/Contents/Resources/ksinstall"',
        );
        expect(execute).to.include('run_as_target_user "$google_update_tool" --nuke');
        expect(getLines(execute).filter((line) => line.includes('--nuke') && !line.includes('run_as_target_user'))).to.deep.equal([]);
      });
    });

    describe('PersistUserEnvironmentConfiguration', () => {
      const scripts = [
        'Disable Homebrew user behavior analytics',
        'Disable NET Core CLI telemetry',
        'Disable PowerShell Core telemetry',
      ];

      for (const name of scripts) {
        it(`follows the bash login-file order in "${name}"`, () => {
          /*
            A bash login shell reads only the first existing of `~/.bash_profile`, `~/.bash_login`
            and `~/.profile`. Creating `~/.bash_profile` unconditionally silently disabled a user's
            `~/.profile`, including the `PATH` set there.
          */
          const { execute } = getScript(OperatingSystem.macOS, name).code;

          expect(execute).to.include(
            'for profile_candidate in "$HOME/.bash_profile" "$HOME/.bash_login" "$HOME/.profile"; do',
          );
          expect(execute).to.include('for profile_file in "$bash_profile_file" "$HOME/.zprofile"; do');
          expect(execute).to.not.match(/\btouch\b/);
          expect(execute).to.include('grep -qxF -- "$profile_line" "$profile_file"');
          expect(execute).to.include('$target_home/.local/state/privacy.sexy/shell-profile/');
        });

        it(`reverts only the recorded line in "${name}"`, () => {
          /*
            The old revert deleted every line matching the configuration as a regex from both files,
            including a line the user wrote, and left behind the files privacy.sexy had created.
          */
          const revert = getRevert(getScript(OperatingSystem.macOS, name));

          expect(revert).to.include('if [ ! -d "$profile_state_dir" ]; then');
          expect(revert).to.include('for profile_name in .bash_profile .bash_login .profile .zprofile; do');
          expect(revert).to.include('ENVIRON["profile_line"]');
          expect(revert).to.include('run_as_target_user tee "$profile_file" < "$profile_new_content"');
          expect(revert).to.include('[ "$profile_origin" = \'created\' ]');
          expect(revert).to.not.include('sed -i');
        });
      }
    });

    describe('reverts restore the recorded state instead of turning features on', () => {
      const cupsScripts = [
        { name: 'Disable local printer sharing with other computers', setting: 'share_printers', option: 'share-printers' },
        { name: 'Disable printing from external addresses, including the internet', setting: 'remote_any', option: 'remote-any' },
        { name: 'Disable remote printer administration', setting: 'remote_admin', option: 'remote-admin' },
      ];
      for (const cups of cupsScripts) {
        it(`turns CUPS "${cups.option}" back on only if it was on, in "${cups.name}"`, () => {
          // macOS ships with these off, so an unconditional `cupsctl --share-printers` (and the
          // others) in revert opened printer sharing and remote CUPS administration.
          const script = getScript(OperatingSystem.macOS, cups.name);
          const revert = getRevert(script);

          expect(script.code.execute).to.include(`cups_setting='${cups.setting}'`);
          expect(script.code.execute).to.include('printf \'on\\n\' > "$cups_state_file"');
          expect(getLines(revert)).to.not.include(`cupsctl --${cups.option}`);
          expectInOrder(revert, [
            'if [ ! -e "$cups_state_file" ]; then',
            'if [ "$current_state" != \'0\' ]; then',
            'cupsctl "--$cups_option"',
          ], cups.name);
        });
      }

      it('turns the application firewall off only if privacy.sexy turned it on', () => {
        // The firewall may have been on before privacy.sexy ran, enabled by the user or by MDM.
        const script = getScript(OperatingSystem.macOS, 'Enable application firewall');
        const revert = getRevert(script);

        expectInOrder(script.code.execute, [
          '--getglobalstate',
          'if [ "$current_state" = \'0\' ]; then',
          'printf \'off\\n\' > "$firewall_state_file"',
          '--setglobalstate on',
        ], script.name);
        expectInOrder(revert, [
          'if [ ! -e "$firewall_state_file" ]; then',
          'if [ "$current_state" != \'1\' ]; then',
          '--setglobalstate off',
        ], script.name);
      });

      it('turns stealth mode off only if privacy.sexy turned it on', () => {
        const script = getScript(OperatingSystem.macOS, 'Enable stealth mode');
        const revert = getRevert(script);

        expectInOrder(script.code.execute, [
          '--getstealthmode',
          'if [ "$current_state" = \'off\' ]; then',
          'printf \'off\\n\' > "$stealth_state_file"',
          '--setstealthmode on',
        ], script.name);
        expectInOrder(revert, [
          'if [ ! -e "$stealth_state_file" ]; then',
          'if [ "$current_state" != \'on\' ]; then',
          '--setstealthmode off',
        ], script.name);
      });
    });

    it('re-enables Remote Management only if privacy.sexy turned it off', () => {
      /*
        Revert ran `kickstart -activate` unconditionally, enabling Remote Management on Macs where
        it had never been on. `RemoteManagement.launchd` is the flag that `kickstart -activate`
        writes and `-deactivate` deletes. `mdmclient`'s `RemoteDesktopEnabled` must not decide it:
        it is also `1` when only Screen Sharing runs, so revert would enable Remote Management.
      */
      const script = getScript(OperatingSystem.macOS, 'Disable remote management service');
      const revert = getRevert(script);

      expectInOrder(script.code.execute, [
        "grep -q 'enabled' \"$remote_management_flag\"",
        'printf \'on\\n\' > "$remote_management_state"',
        '"$kickstart_tool" -deactivate -stop',
      ], script.name);
      expectInOrder(revert, [
        'if [ ! -e "$remote_management_state" ]; then',
        "elif grep -q 'enabled' \"$remote_management_flag\"",
        '"$kickstart_tool" -activate -restart -agent -console',
      ], script.name);
      for (const code of [script.code.execute, revert]) {
        expect(code).to.not.include('mdmclient');
      }
    });

    it('restarts the Dock as the invoking user after changing recent applications', () => {
      // The Dock reads `show-recents` only at startup, so without a restart nothing changed until
      // the next login. As root, `killall Dock` would also restart other signed-in users' Docks.
      const script = getScript(OperatingSystem.macOS, 'Disable display of recent applications on Dock');
      const revert = getRevert(script);

      expectInOrder(script.code.execute, ['defaults write "$preference_domain"', 'run_as_target_user killall Dock'], script.name);
      expectInOrder(revert, ['defaults delete "$preference_domain"', 'run_as_target_user killall Dock'], script.name);
      for (const code of [script.code.execute, revert]) {
        expect(getLines(code).filter((line) => line.includes('killall Dock') && !line.includes('run_as_target_user'))).to.deep.equal([]);
      }
    });
  });

  describe('Linux', () => {
    describe('SetKernelParameter', () => {
      const restrictions = [
        { name: 'Disable unprivileged access to kernel logs', key: 'kernel.dmesg_restrict' },
        { name: 'Disable exposure of kernel memory addresses', key: 'kernel.kptr_restrict' },
        { name: 'Disable process debugging by unrelated processes', key: 'kernel.yama.ptrace_scope' },
      ];
      for (const restriction of restrictions) {
        it(`never lowers a stricter "${restriction.key}"`, () => {
          /*
            Hardened systems run `kptr_restrict=2` or `ptrace_scope=2`/`3`. Writing `1` there, and
            persisting it in a drop-in that overrides theirs, lowered the protection the script
            promises to raise. The comparison must come before both the persist and the apply.
          */
          const { execute } = getScript(OperatingSystem.Linux, restriction.name).code;

          expect(execute).to.include(`kernel_key='${restriction.key}'`);
          expect(execute).to.include("kernel_keep_stricter_value='true'");
          expectInOrder(execute, [
            '[ "$current_value" -ge "$kernel_value" ]; then',
            'is already \\"$current_value\\", which is at least as strict',
            'else',
            'sudo tee -a "$config_file"',
            'sudo sysctl --write "$kernel_key=$kernel_value"',
          ], restriction.name);
        });
      }

      it('still writes keys where a higher number is not stricter', () => {
        // `unprivileged_bpf_disabled=1` is a latch rather than "stricter than 2", and
        // `use_tempaddr` is not a restriction level, so neither may be skipped by the comparison.
        for (const name of ['Disable unprivileged eBPF access', 'Enable IPv6 privacy extensions']) {
          const { execute } = getScript(OperatingSystem.Linux, name).code;

          expect(execute, name).to.include("kernel_keep_stricter_value=''");
        }
      });
    });

    it('masks the pkgstats timer that `systemctl disable` cannot turn off', () => {
      /*
        pkgstats enables its timer through a vendor link in
        `/usr/lib/systemd/system/timers.target.wants`, which `systemctl disable` does not remove,
        so the timer came back at the next boot.
      */
      const script = getScript(OperatingSystem.Linux, 'Disable weekly `pkgstats` submission');
      const revert = getRevert(script);

      expect(script.code.execute).to.include("unit='pkgstats.timer'");
      expect(script.code.execute).to.include('sudo systemctl mask --now "$unit"');
      expect(script.code.execute).to.not.include('systemctl disable');
      expectInOrder(revert, [
        'if [ ! -e "$unit_state_file" ]; then',
        '!= \'masked\' ]',
        'sudo systemctl unmask "$unit"',
      ], script.name);
    });

    it('keeps disabling other services through `systemctl disable`', () => {
      // The mask is only for vendor-enabled units; other callers keep their existing handling.
      const { execute } = getScript(OperatingSystem.Linux, 'Disable Apport service').code;

      expect(execute).to.include('sudo systemctl disable "$service"');
      expect(execute).to.not.include('systemctl mask');
    });

    it('disables the path unit that restarts Whoopsie, before the service, and reverts both', () => {
      /*
        Since Ubuntu 22.04, `whoopsie.path` starts the service whenever `/var/crash` changes, so
        disabling only `whoopsie.service` left crash reports being submitted. The path unit goes
        first so it cannot start the service again while it is being stopped.
      */
      const script = getScript(OperatingSystem.Linux, 'Disable Whoopsie service');
      const revert = getRevert(script);

      expectInOrder(script.code.execute, ["service='whoopsie.path'", "service='whoopsie'"], script.name);
      expectInOrder(revert, ["service='whoopsie.path'", "service='whoopsie'"], script.name);
    });

    it('records static units as static so their revert is not skipped', () => {
      /*
        `whoopsie.service` has no [Install] section on Ubuntu 22.04 and later, so `is-enabled`
        reports `static` before and after `disable`. Recording it as `enabled` made every revert
        report that it had "changed" and skip.
      */
      const script = getScript(OperatingSystem.Linux, 'Disable Whoopsie service');
      const revert = getRevert(script);

      expect(script.code.execute).to.include('printf \'%s\\n%s\\n\' "$enabled_state" "$active_state"');
      expect(script.code.execute).to.not.include('printf \'enabled\\n%s\\n\'');
      expect(revert).to.include(
        '|| { [ "$original_enabled" != \'static\' ] && systemctl is-enabled --quiet "$service"; }; then',
      );
    });

    it('clears screenshots only from the default folders, one level deep, as the invoking user', () => {
      /*
        `find ~ -name 'ksnip_*'` walked the whole home folder as root, including mounted drives,
        backups and the trash, and the `~/Pictures` searches deleted matches in every subfolder.
      */
      const script = getScript(OperatingSystem.Linux, 'Clear screenshots');
      const findLines = getLines(script.code.execute).filter((line) => /\bfind\b/.test(line));

      expect(findLines).to.have.lengthOf(3);
      for (const line of findLines) {
        expect(line).to.match(/^run_as_target_user find -H "[^"]+" -maxdepth 1 -type f/);
      }
      expect(script.code.execute).to.not.include('rm -rfv');
      expect(script.code.execute).to.not.match(/find ~ /);
      expect(script.docs.join('\n')).to.include('> **Caution:**');
    });

    it('creates the Python history file as the invoking user and removes it on revert', () => {
      /*
        As root, `touch` created a root-owned `~/.python_history`. Revert only removed the immutable
        flag, so the root-owned file stayed behind and Python could still never write its history.
      */
      const script = getScript(OperatingSystem.Linux, 'Disable Python history for future interactive commands');
      const revert = getRevert(script);
      const executeLines = getLines(script.code.execute);

      expect(script.code.execute).to.include('run_as_target_user touch "$history_file"');
      expect(executeLines.filter((line) => /^touch\b/.test(line))).to.deep.equal([]);
      for (const code of [script.code.execute, revert]) {
        expect(code).to.include('realpath -- "$history_file"');
        expect(code).to.not.include('realpath $history_file');
      }
      expect(script.code.execute).to.include('$target_home/.local/state/privacy.sexy/python');
      expectInOrder(revert, [
        'sudo chattr -i "$history_target"',
        '[ ! -s "$history_file" ]',
        '[ -e "$history_state_file" ]',
        'run_as_target_user rm -f -- "$history_file"',
      ], script.name);
    });
  });
});
