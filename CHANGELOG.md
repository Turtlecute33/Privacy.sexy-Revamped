# Changelog

Every commit merged to `master` is built and deployed to <https://debloat.net> once the
unit and integration tests pass. Releases are tagged (`v<version>`) and published on
[GitHub Releases](https://github.com/Turtlecute33/Debloat.net/releases) to mark tested
milestones; `git log` remains the complete history of changes.

Release history up to and including `0.13.8`, the point this project forked, belongs to upstream and is
kept there: <https://github.com/undergroundwires/privacy.sexy/blob/master/CHANGELOG.md>.

## 0.18.1 (2026-11-10)

A review and test of the Windows scripts. Every one of them was applied twice and reverted twice on
real machines, Windows 11 25H2 and Windows Server 2025, while the registry keys it names, every
service, every scheduled task and the hosts file were recorded before and after. The collection was
also read line by line against Windows' own policy definitions and the vendors' documentation. The
fixes below are what that turned up.

Protecting your files and system:

- Cleaning a folder no longer deletes what a junction or symbolic link inside it points to. A link in
  the temporary folder that pointed at a folder elsewhere, as build tools leave them, had that folder
  emptied by "Clear temporary user folder" and the other folder cleanups.
- "Clear previous Windows installations" no longer takes ownership through the junctions that
  `Windows.old` keeps to the live `C:\Users` and `C:\ProgramData`.
- Reverting a script that renamed a Windows system file no longer overwrites the file when Windows
  Update has put it back in the meantime. The older copy used to replace the current one.
- The hosts file is edited byte for byte. Reverting a "Block ... hosts" script used to put a byte
  order mark in front of the first line and replaced accented characters in your own comments. On
  Windows 11 some entries were also dropped while Windows still had the file open; the scripts now
  wait and retry.
- OneDrive is not uninstalled while it backs up your Desktop, Documents or Pictures. Files that
  OneDrive keeps only in the cloud would have stopped opening.

Presets:

- "Standard" no longer turns location off. Since Windows 11 24H2 that stops apps, and
  `netsh wlan`, from listing Wi-Fi networks. "Disable app access to location", "Disable location"
  and "Disable device sensors" (which breaks screen auto-rotation) are now in "Strict", with what
  they break in their names. "Disable Application Compatibility Engine" and "Disable telemetry
  collector and sender process" moved to "Strict" as well.
- "Disable text and handwriting data collection" no longer locks online speech recognition, which
  broke voice typing. The lock is its own "Strict" script, "Disable online speech recognition by
  policy". If dictation stopped working after an earlier version, reverting that script restores it.
- "Remove OneSync capability" is no longer part of "Strict": presets do not remove components.
- Ten scripts that do nothing on current software are gone: seven for Edge and Chrome policies that
  the browsers have removed, "Disable iFilters and protocol handlers", "Disable Edge sign-in prompt
  on new tab page" and "Disable outdated non-administrator access to Defender threat history".
  "Disable Edge Bing ads" stays, named for what it is: it only applies to school accounts.

Scripts that did not work:

- "Remove Widgets from taskbar": Windows 11 refuses the setting it used ("Access is denied"). It now
  sets the default of the Allow widgets policy.
- "Minimize DISM Reset Base update data" and "Disable Windows Defender boot logging" failed with
  "Access is denied" on every machine tested. They now run as TrustedInstaller, which those keys
  require. The second still needs Tamper Protection to be off.
- Reverting "Remove Edge through official installer" never finished: the installer was started with
  its arguments in an order it rejects. Edge is now reinstalled.
- Reverting "Disable Secure Boot driver" printed "Reverted" and left the driver disabled.
- "Clear credentials in Windows Credential Manager" deleted nothing on a Windows that is not in
  English.
- "Disable Windows Update driver search" wrote the value for "search if needed" instead of "never".
  "Disable insecure SMBv1 protocol" wrote a value name the server does not read. "Disable Windows
  Remote Assistance feature" wrote one policy under a wrong name. "Disable Start menu suggestions"
  did the same for the Windows 11 setting.
- "Disable Windows Tips" only wrote a policy that Home and Pro editions ignore. It now also turns
  off the user's own setting.
- The VS Code and WinGet scripts failed on a settings file with comments, which is what WinGet
  creates and what most VS Code users have. They now read such files and keep a copy of the
  original next to it, because a rewritten file cannot keep the comments.
- Cleanup scripts pointed at folders that do not exist: Internet Explorer DOMStore, .NET usage logs,
  the Java cache, and Outlook signatures, stationery and templates. "Clear all Firefox user
  information and preferences" left Firefox unable to start.
- Files with brackets in their names, such as `report[1].txt`, were reported as deleted and left in
  place. Registry keys with a default value were not cleared.
- Google's current updater, Microsoft's renamed compatibility task, the per-machine OneDrive update
  task and the policy that hides the new Outlook toggle are now covered.

Reverting:

- Several reverts restored the wrong state: the passive connectivity poll period, the Automatic
  Updates policies, driver updates in quality updates, the update pause flag, Defender's cloud
  block level on Windows 10, and the folders under "This PC" on Windows 11 24H2 and later.
- Reverting a shortcut removal no longer creates shortcuts to a program that is not installed.
- Reverting a disabled Windows feature also enables the features it depends on, and no longer
  reports a feature that is already enabled as a failure.
- Reverting the Windows Global Device ID block removes the hosts entries even when the firewall
  rules cannot be removed, for example with the Windows Firewall service disabled. It used to leave
  Microsoft sign-in blocked.

Everywhere:

- A script started by a 32-bit program restarts in the 64-bit command processor. It used to write
  machine-wide settings to the 32-bit part of the registry and report success.
- A profile folder with an apostrophe in its name (`D'Angelo`) no longer breaks the folder cleanups
  and every command that runs as TrustedInstaller.
- The Defender scripts now say when Tamper Protection ignored a setting, instead of "Successfully
  set".
- Per-user services are handled for every signed-in user, not only when one user is signed in.
- The update pause scripts write their start dates in the Gregorian calendar and in UTC on every
  regional setting.
- Generated scripts are about 6% smaller, and the longest command line is 800 characters below the
  limit of the command processor instead of 15.

Known limitations:

- Reverting a disabled service, scheduled task or app permission restores the Windows default, not
  the state from before the script ran.
- While Tamper Protection is on, Windows refuses most of the opt-in "Disable Defender" scripts. They
  report the refusal.
- Windows 11 refuses changes to the default app for PDF files and web links, so "Remove Edge user
  associations" reports a failure for those.
- Reinstalling a removed Windows capability depends on Windows Update and can take a long time.
- Some opt-in scripts that disable Windows Security components rename the files in `System32` only.
  Current Windows 11 builds keep further copies in a versioned `SecurityHealth` folder.

Repository:

- `checks.windows-scripts` is a new on-demand workflow that runs every Windows script on GitHub's
  Windows 11 and Windows Server 2025 runners and uploads what each one printed and changed. See
  [docs/tests.md](docs/tests.md#windows-script-check).

## 0.18.0 (2026-11-10)

A flatter, quieter interface, and a round of fixes to the Linux scripts. Every Linux script was run
twice and reverted twice in a sandbox built from an Omarchy (Arch Linux) installation, with real `sudo`
and `systemd`; the fixes below are what that turned up.

Interface:

- Panels are flat, with a single hairline edge instead of a glossy rim and large shadows. Only tooltips
  and the dialog, which float over the page, cast a shadow. Buttons, checkboxes and the pickers lose
  their gradients and glows, and the dark appearance is a dark grey instead of near black.
- A script's documentation button and apply/revert switch appear when you point at the row or focus it,
  so a long list reads as titles. The switch stays visible once the script is selected, and touch
  screens always show both.
- Text is one step larger: 15px body text, up from 14px.
- The slogan is now "Debloat is sexy". It opens every generated script and leads the footer.

Linux scripts:

- Brave policies now apply on Arch Linux and to Brave Origin. The six "Configure Brave" scripts looked
  for the `brave-browser` command, which the Arch packages name `brave`, so they reported that Brave was
  not installed. The Brave cleanup scripts also clean Brave Origin's profile and cache folders.
- "Remove orphaned Flatpak runtimes" cleans the system-wide installation as root and your own
  installation as you. It used to run both as root and left files in your home folder that you could
  no longer change.
- GNOME settings are read back after they are set. Without a desktop session, for example over SSH,
  `gsettings` reports success but saves nothing, and the scripts repeated that success.
- Reverting a "Remove ... package" script reinstalls the package only if the script removed it. It used
  to install the package on any system that lacked it, so reverting "Remove `pkgstats` package" installed
  a usage statistics tool where there had never been one. If you removed a package with an earlier
  version, the revert now prints the command to install it yourself.
- Environment variables are written to `/etc/environment` as complete lines. The last one had no line
  ending, so the next program to add a variable joined it to that line. Reverting now leaves the file
  exactly as it was.
- A script that ran to the end no longer exits with an error and "Failed to relaunch the script with
  administrator privileges" when no key can be read at the closing prompt.
- "Clear Snap application cache" and "Clear Firefox crash reports" delete folders too, not only files.
  The second also covers `~/.config/mozilla/firefox`, where Firefox 147 and later keep new profiles.
- "Clear clicked links history in Thunderbird" deletes `places.sqlite-wal`; it looked for
  `places.sqlite.wal`. The Thunderbird cleanup scripts also cover `~/.config/thunderbird`.
- "Disable connectivity checks" reports whether NetworkManager reloaded its configuration instead of
  always saying it did.
- Reverting "Remove Zorin OS census unique ID" no longer creates an ID on systems without Zorin OS
  census.

Repository:

- The repository is now `Turtlecute33/Debloat.net`; GitHub redirects the old address. The package is
  named `debloat.net`, so generated scripts open with "debloat.net: ..." instead of "privacy.sexy: ...".
  The scripts keep their `privacy.sexy` state names, so reverting still works on machines where earlier
  scripts ran.
- Each push runs one Ubuntu pipeline (lint, tests, build and E2E). Link checks and the macOS, Windows
  and Docker runs moved to a weekly schedule.

## 0.17.1 (2026-11-10)

The page does less work while it loads. With the CPU slowed down four times, which roughly matches what
PageSpeed Insights measured (410 ms), the page was blocked for about 400 ms of long tasks after the
first paint; now it is about 160 ms. No script changes.

- Only the scripts of the operating system on screen are prepared in the background after the page
  loads. Preparing all three kept the page busy for several seconds, even for visitors on macOS or
  Linux, and some Windows scripts take over 100 ms each. A system's scripts are prepared when you
  switch to it.
- Before the first paint the script list builds only the rows that fit in the window, and it prepares a
  script's code only when its row is shown. The remaining rows follow a few per frame, as before.
- The code preview is built in a step of its own after the editor downloads, and the system and preset
  pickers no longer force a layout of the whole page while the page is being built.
- The 14 interface icons ship with the app (about 3 KB) instead of as 14 separate downloads, so they no
  longer disappear for a moment while the page starts.
- Repository: a new README with current screenshots, an updated contributing guide and security policy,
  and shorter issue forms.

## 0.17.0 (2026-11-10)

The site has moved to its own domain, debloat.net. Every old privacy.turtlecute.org address forwards to the
same page on debloat.net, so bookmarks and shared links keep working.

- The top bar, page titles, canonical links, link previews, structured data, sitemap, `robots.txt`,
  `llms.txt` and the web app manifest now use debloat.net. "privacy.sexy Revamped" and
  privacy.turtlecute.org stay listed as alternate names, so searches for either still find the site.
- Downloaded scripts now start with the site's address (`https://debloat.net`) instead of the GitHub
  repository URL.
- The link preview image shows the new address; its URL revision changed so cached previews refresh.
- If you installed the site as an app, reinstall it from the new address.
- The external link check now lists links whose server refuses automated requests (401, 403, 406, 429,
  501) as unverified instead of failing. Removed pages and dead hosts still fail it.

## 0.16.3 (2026-11-09)

The site now goes by its own address, privacy.turtlecute.org. "privacy.sexy" is the upstream project's
domain, so a name that led with it taught visitors to type the original's address.

- The top bar, link previews (site name and image), the catalog and comparison pages, the web app
  manifest, `llms.txt` and the structured data now name the site privacy.turtlecute.org.
- Page titles and descriptions still say "privacy.sexy fork", and "privacy.sexy Revamped" remains a
  listed alternate name, so searches for either keep finding the site.
- The link preview image is a minimal card: the address, one headline and "The actively maintained fork
  of privacy.sexy". Its URL revision changed again so cached previews refresh.
- Desktop, 993 to 1035px wide: the preset picker no longer runs under the search field.

## 0.16.2 (2026-11-09)

- The link preview image shown when the site is shared (Open Graph and Twitter card) now matches the
  redesign: the light glass look, the new logo and a small picture of the workbench. Its URL carries a
  revision so previews cached by Telegram, X, LinkedIn and Facebook pick up the new image.
- Three Windows citations (BleepingComputer, Windows Latest and The Hacker News) now point to archived
  copies. These sites block GitHub's servers, which made the external link check fail on several pushes.

## 0.16.1 (2026-11-09)

### Fixes

- Desktop: on screens wider than the workbench, making the window shorter than 620px moved the whole
  workbench sideways by half a scrollbar when the page started to scroll. It now stays in place.
- The external link check no longer fails on GNOME's GitLab, which rejects its requests on some runs
  while the pages are reachable.

## 0.16.0 (2026-11-09)

A redesigned interface that uses less CPU, plus pages and files that make the catalog easier for search
engines and AI answer engines to read. No script changes.

### Interface

- The page is now a desktop-style workbench: one bar for the system, preset and search, then the
  categories, the script list and the generated script side by side, with only the panels scrolling.
  On narrow screens it stacks into a scrolling page.
- Light and dark appearances follow the system setting, including the code editor's colours. The
  interface uses the platform's own font instead of downloading two display fonts.
- The backdrop behind the glass panels is softer, so small text stays readable. The light-mode footer
  text now meets WCAG AA contrast. If your system asks for reduced transparency, the panels are nearly
  opaque.
- The top bar shows the running version, linked to its release notes.

### Performance

- Only tooltips and the download dialog blur what is behind them. The large panels blurred a backdrop
  that never moves, which looked the same but redid the blur on every scrolled frame and hover. CPU per
  scrolled frame: 16.2 ms to 1.85 ms with software rendering, 1.30 ms to 0.95 ms with GPU rendering.
- Selecting or deselecting a script updates only the changed lines of the generated script instead of
  rebuilding all of it, cutting the script work per click with a large selection from 11.5 ms to 4.5 ms.
- The code editor no longer keeps an undo history of every update. It grew by about 1 MB per click with
  a large selection for as long as the tab stayed open.

### Search engines and AI answer engines

- The home page links to the Windows, macOS and Linux catalogs and the alternatives page, which were
  previously reachable only through the sitemap.
- New `/llms.txt` summarizes the tool, how it handles data and its catalogs, and `/llms-full.txt` lists
  every tweak with its recommendation tier. `robots.txt` points to both.
- The structured data now carries the current version (it said 0.13.8) and links the repository and the
  upstream project.

### Fixes

- Deploys would have failed at the prerender step after the redesign, which changed a label the
  prerender check looked for.
- The web manifest still used the old navy theme colour.

## 0.15.0 (2026-11-09)

140 new scripts across Windows, macOS and Linux, reviewed after they were written: the generated code of
every script was compiled and syntax-checked, and the Firefox, ufw and other shared functions were run
against simulated systems.

### New scripts

140 new scripts: 41 for Windows, 47 for macOS and 52 for Linux. Each one was checked against vendor
documentation, and none of them sets or reverts anything an existing script already changes. The only
overlap is that the new Chrome, Chromium and Brave cache cleanups on Linux delete part of what "Clear
user-specific cache" already deletes.
Recommendation levels are conservative: `standard` only where nothing a typical user relies on changes,
`strict` where privacy costs some convenience, and no preset for anything that deletes data, can cut off
access or changes how the system works day to day.

- All platforms: telemetry opt-outs for development tools (Next.js, Nuxt, Astro, Angular CLI, Storybook,
  Turborepo, HashiCorp tools, Azure CLI, Google Cloud CLI, Hugging Face Hub and vcpkg), and a new
  "Configure Brave" category (product analytics, usage ping, Web Discovery Project, Rewards, Wallet, the
  Leo AI assistant, and VPN on Windows and macOS, where Brave offers it).
- Windows: automatic proxy discovery (WPAD), IPv6 transition technologies, network device discovery,
  IP source routing and ICMP redirects; the highest User Account Control level; account details, the last
  user name and the password reveal button on the sign-in screen; potentially unwanted app blocking in
  Defender; page file clearing at shutdown; blocking macros in Office files from the internet and
  unsigned macros; Find My Device; personalized website recommendations in Start; Edge and Chrome
  running in the background; and cleanup of PowerShell history, Remote Desktop history, folder view
  history, program usage history, the Delivery Optimization cache and superseded component versions.
- macOS: Firefox privacy hardening (previously Linux only); password hints and the user list on the login
  window; Screen Sharing, SMB file sharing and Bluetooth file sharing; the full website address in Safari;
  an opt-in script that stops Terminal from keeping a separate zsh history per window; and cleanup of zsh
  session history, Python history, saved application state, the Quick Look thumbnail cache, recent items
  and Finder's recent folders.
- Linux: TTY line discipline autoloading, core dumps of privileged programs, runtime kernel loading
  (kexec), FireWire direct memory access and rarely used filesystems; GNOME automount, autorun and lock
  screen notifications; a ufw firewall that keeps SSH sessions reachable; KDE activity tracking; Ubuntu
  Insights; Chrome policies and Thunderbird telemetry; and cleanup of Chrome, Chromium and Brave data and
  of KDE activity history.
- macOS and Linux: cleanup of command-line tool history (Vim, less, Node.js, MySQL, PostgreSQL, SQLite,
  irb and the wget HSTS list), and opt-in scripts that stop less, Node.js and MySQL from keeping history.

Ideas that could not be verified or reverted safely are recorded under "Rejected by vetting" in
[script-proposals.md](./docs/script-proposals.md).

### Fixes

- Firefox and Thunderbird: reverting a preference whose new value equals the application's default, such
  as turning First-Party Isolation back on, no longer stops with "changed after privacy.sexy applied it".
  The application leaves such a preference out of `prefs.js`, which the check treated as a change.
- Linux: Firefox scripts also find profiles in `~/.config/mozilla/firefox`, where Firefox 147 and later
  create them on a new installation.
- Linux: "Enable Firefox network partitioning" is no longer recommended, because Firefox 141 removed its
  preference and always partitions network state.

### Known limitations

- macOS: the Brave scripts write `/Library/Managed Preferences/com.brave.Browser.plist`, the only place
  Brave reads these policies from on a Mac without device management. It has not been confirmed whether
  macOS keeps a file there across restarts when no configuration profile installed it.
- Firefox on macOS and Linux: reverting while Firefox is open only prints a warning. Firefox can then
  write the changed preference back when it quits, so quit Firefox before reverting.
- Windows: reverting a development tool telemetry script also removes the variable if you had set the
  same value yourself before running the script.
- The limitations listed for 0.14.0 still apply.

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
