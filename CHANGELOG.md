# Changelog

Every commit merged to `master` is built and deployed to <https://debloat.net> once the
unit and integration tests pass. Releases are tagged (`v<version>`) and published on
[GitHub Releases](https://github.com/Turtlecute33/Privacy.sexy-Revamped/releases) to mark tested
milestones; `git log` remains the complete history of changes.

Release history up to and including `0.13.8`, the point this project forked, belongs to upstream and is
kept there: <https://github.com/undergroundwires/privacy.sexy/blob/master/CHANGELOG.md>.

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
