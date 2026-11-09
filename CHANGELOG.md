# Changelog

Every commit merged to `master` is built and deployed to <https://privacy.turtlecute.org> once the
unit and integration tests pass. Releases are tagged (`v<version>`) and published on
[GitHub Releases](https://github.com/Turtlecute33/Privacy.sexy-Revamped/releases) to mark tested
milestones; `git log` remains the complete history of changes.

Release history up to and including `0.13.8`, the point this project forked, belongs to upstream and is
kept there: <https://github.com/undergroundwires/privacy.sexy/blob/master/CHANGELOG.md>.

## 0.14.0 (2026-11-09)

The first release of this fork. It follows a full review of the scripts, the application and the build:
every generated Windows PowerShell command is now checked by the real PowerShell parser, and every
generated macOS and Linux script by `bash -n`.

### Scripts that did nothing or failed

- Windows: all 30 "Disable ... feature" scripts generated PowerShell that did not parse, so they changed
  nothing when applied or reverted.
- Windows: reverting "Disable automatic OneDrive installation" failed to parse on every Windows version.
- Windows: the Internet Explorer CEIP opt-out wrote the value that allows participation.
- Windows: "Disable tailored experiences with diagnostic data", "Disable Windows Spotlight" and
  "Disable local search history" only wrote machine-wide (`HKLM`) values for policies that Windows reads
  per user. They now also write the per-user (`HKCU`) values.
- Windows: registry string data containing double quotes lost them, so "Disable Outlook automatic
  installation" wrote `[MS_Outlook]` instead of `["MS_Outlook"]`.
- Windows: "Disable WinGet telemetry" did nothing on systems where WinGet's settings file does not exist
  yet; the file is now created.
- Windows: re-running a feature script before a restart reported a failure for a feature that was
  already being disabled.
- Linux: "Disable weekly `pkgstats` submission" came back at the next boot; the timer is now masked.
- Linux: "Disable Whoopsie service" left `whoopsie.path`, which restarts the service after a crash.
- macOS: turning off recent applications in the Dock now restarts the Dock so the change applies.

### Safety

- macOS: "Clear File Quarantine attribute from downloaded files" pasted file names into shell code that
  runs as root, so a downloaded file with a crafted name could run its own commands. File names are now
  passed as arguments.
- macOS: log and cache clearing ran `rm -rf` on unquoted paths as root, so a home folder with a space in
  its name could delete the wrong directories.
- macOS: Composer, gem, Docker, npm, Yarn, pyenv and Google Software Update cleanups ran user-owned
  programs as root. They now run as the signed-in user.
- macOS: Homebrew, .NET and PowerShell telemetry opt-outs created `~/.bash_profile`, which silently
  stopped bash from reading an existing `~/.profile`. They now follow bash's own startup-file order.
- Linux: kernel hardening scripts no longer lower a stricter value that is already set (for example
  `kptr_restrict=2`).
- Linux: "Clear screenshots" searched the whole home folder; it now only looks in the default screenshot
  folders.
- Linux: removing a pacman package no longer removes every package that depends on it, and no longer
  matches unrelated packages that only mention its name.
- Windows: "Remove empty OneDrive folders" could delete folders that contained only hidden files.
- Windows: "Clear recent files and folders history" no longer deletes taskbar jump lists and pinned items.
- Windows: the Paint generative AI script no longer wipes other Paint policies set by Group Policy or MDM.
- Windows: scripts whose names hide data loss now say so, for example
  "Clear Outlook user data (permanently deletes local mail, signatures and macros)".

### Reverts

- Windows: reverting a removed capability now re-adds only what privacy.sexy removed. Before, reverting
  "Remove OpenSSH Server" installed the server on machines that never had it.
- macOS: reverting printer sharing, remote printing, remote printer administration, the application
  firewall, stealth mode and Remote Management restores the previous state instead of turning them on.
- Linux: services that cannot be disabled the usual way (`static` units) can now be reverted.

### Stability

- A failing step no longer ends the whole generated script. The embedded PowerShell runner on Windows and
  the preference helper on macOS used to exit, skipping every later script, and on Windows the window
  closed before the error could be read.
- Windows: PowerShell now starts without loading the user's profile, which made runs much slower on
  machines with a heavy profile and could change how commands behaved.
- Windows: several helpers handled file names containing `[` or `]` incorrectly, or stopped at the first
  missing file; hosts-file entries no longer merge into a last line without a line break; JSON settings
  files keep their non-ASCII characters.
- Script names with `&`, `<`, `>`, `|`, `^` or `%` are now printed and commented correctly in batch files.

### Website

- The page no longer measures about a million pixels tall before it finishes loading on phones, or
  permanently without JavaScript: the pre-rendered code preview is now plain text.
- A broad search no longer freezes the page: results appear at once and fill in progressively.
- Tooltips no longer slow down scrolling the more of them have been opened, and Escape closes them.
- If the site fails to start, for example because a cached page refers to files a new deploy replaced, it
  reloads once and otherwise says so, instead of showing a page that looks ready but does nothing.
- Choosing the Standard, Strict or All preset now applies its reverted scripts instead of leaving the
  selection on "Custom". Toggling revert keeps a script in place in the generated file.
- Closing a search returns to the category you were viewing.
- Search matches the same text in every locale (it missed "IPv6" under a Turkish locale) and compiles
  fewer scripts while searching.
- Loading the collections uses about 40 MB less memory and compiles a third faster.
- If the code editor fails to load, it retries on the next interaction instead of showing a spinner
  forever. Closing a dialog no longer scrolls the page to the top and back.
- The privacy claims on the page now describe the anonymous, cookie-free page-view count accurately.

### Build and release

- Production deploys now wait for the unit and integration tests, and a running deploy is no longer
  cancelled by the next push.
- Production dependencies have no known vulnerabilities (Vue, markdown-it and source-map-js updated).
- The Docker image uses Node 22, like the deploy, and no longer downloads unused browsers.
- New tests guard against the defects above: PowerShell syntax, cmd's line-length limit, `%` handling,
  scripts that end the whole run, and file names pasted into shell code.

### Known limitations

- Windows: a user profile path containing an apostrophe (for example `C:\Users\D'Amico`) makes some
  cleanup commands and TrustedInstaller operations fail. They fail without changing anything.
- Windows: when a standard user elevates with an administrator's credentials, per-user settings apply to
  the administrator's profile.
- Development tooling (Vitest, Cypress, the ESLint stack) has known advisories that need major-version
  upgrades. None of it ships to the website.
