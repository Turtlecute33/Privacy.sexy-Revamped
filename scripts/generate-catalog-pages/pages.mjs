/*
 * Page content for the static catalog and article pages.
 *
 * Two rules govern what goes on these pages, and both come out of the SEO audit:
 *
 * 1. No upstream script documentation. 1084 of this fork's 1164 scripts carry documentation prose
 *    byte-identical to upstream privacy.sexy, and the upstream author already publishes that corpus
 *    as ~700 per-script pages on his own site. Republishing it here would be near-duplicate content
 *    competing against the person who wrote it. So these pages carry an index of script names plus
 *    prose written for this fork — never the catalog's `docs:` bodies.
 * 2. The recommendation verdict is the unique signal. This fork moved 266 scripts out of a
 *    recommendation tier and upgraded none, which is editorial work that exists nowhere else. The
 *    per-script tag and the counts in the summary are that work, made visible.
 */
import { escapeHtml, renderPage, slugify } from './layout.mjs';

const OS_COPY = {
  windows: {
    title: 'Windows privacy and debloat script catalog',
    metaTitle: 'Windows privacy & debloat scripts: full catalog | privacy.sexy Revamped',
    description:
      'Every Windows tweak in privacy.sexy Revamped, with this fork\'s recommendation for each '
      + 'one. Remove preinstalled apps, disable telemetry and Recall, and harden Windows 11 and 10.',
    intro: `
      <p class="lede">
        This is the full index of what the Windows collection can change, grouped the way the
        script builder groups it. Every entry is a tweak you can select, read as plain
        commands, and download as one script that runs locally.
      </p>
      <p>
        Windows is the largest collection here because it has the most to switch off. It covers
        diagnostic telemetry and the DiagTrack service, Recall and Click to Do, the Copilot app
        and Copilot in Edge, advertising and content recommendations, preinstalled Store apps,
        OneDrive, Xbox, Widgets, and the connectivity checks and scheduled tasks that report
        back on their own schedule. It also carries defensive hardening: DNS privacy, insecure
        cipher and protocol removal, remote administration lockdown and Meltdown/Spectre
        mitigations.
      </p>
      <p>
        Not everything here is advisable, and the tags say which is which. A tweak tagged
        <b>Opt-in only</b> is deliberately excluded from both recommendation presets &mdash;
        most of the "Privacy over security" section is in that state, because turning off
        Defender, SmartScreen or automatic updates buys privacy by removing a protection.
        This fork moved a large number of upstream's recommendations into that tier rather than
        dropping the scripts, so the choice stays available and stops being a default.
      </p>`,
  },
  macos: {
    title: 'macOS privacy and hardening script catalog',
    metaTitle: 'macOS privacy & hardening scripts: full catalog | privacy.sexy Revamped',
    description:
      'Every macOS tweak in privacy.sexy Revamped, with this fork\'s recommendation for each one. '
      + 'Reduce Apple data collection, configure Siri and Safari, and harden the firewall.',
    intro: `
      <p class="lede">
        This is the full index of what the macOS collection can change, grouped the way the
        script builder groups it. Every entry is a tweak you can select, read as plain
        commands, and download as one script that runs locally.
      </p>
      <p>
        macOS ships fewer switches than Windows, and Apple removes or renames the ones it does
        ship without notice, so this collection is smaller and more conservative by design. It
        covers Apple diagnostic and usage data, Siri and its dictation and analytics surfaces,
        Safari configuration, application privacy permissions, log and cache clearing, the
        application firewall and stealth mode, guest accounts, screen-saver locking, and
        printer and remote sharing services.
      </p>
      <p>
        The <b>Opt-in only</b> tag matters more here than anywhere else. Disabling Gatekeeper or
        File Quarantine removes the checks that stop unsigned and downloaded code from running,
        and those entries exist so the option is documented rather than recommended. Anything
        needing System Integrity Protection turned off is out of scope entirely.
      </p>`,
  },
  linux: {
    title: 'Linux privacy and hardening script catalog',
    metaTitle: 'Linux privacy & hardening scripts: full catalog | privacy.sexy Revamped',
    description:
      'Every Linux tweak in privacy.sexy Revamped, with this fork\'s recommendation for each one. '
      + 'Clear shell and package history, disable distro telemetry, and harden the kernel.',
    intro: `
      <p class="lede">
        This is the full index of what the Linux collection can change, grouped the way the
        script builder groups it. Every entry is a tweak you can select, read as plain
        commands, and download as one script that runs locally.
      </p>
      <p>
        This is a desktop Linux collection, not a server baseline. If you came looking for CIS
        or STIG remediation, an Ansible role will serve you better. What is here is the privacy
        surface of a workstation: shell and terminal history, recently-used file lists, package
        manager data for APT, Snap and Flatpak, shared caches and thumbnails, Firefox and
        Thunderbird profiles, Wine and Visual Studio Code state, and the distribution telemetry
        that Ubuntu, Debian, Arch and Zorin each collect differently &mdash; popcon, pkgstats,
        Apport, Whoopsie and the Ubuntu metrics reporter. Kernel and network hardening sysctls
        sit alongside them.
      </p>
      <p>
        Distribution coverage is uneven and worth saying plainly: Debian and Ubuntu derivatives
        are covered best, Arch and Zorin partially, and Fedora and openSUSE barely at all. A
        script that targets a path your distribution does not use reports that it skipped and
        moves on.
      </p>`,
  },
};

export function renderCollectionPage(collection) {
  const copy = OS_COPY[collection.key];
  const path = `/${collection.slug}/`;
  const groups = collection.categories.map((category) => ({
    category,
    id: slugify(category.name),
    scriptCount: countScripts(category),
  }));
  const rail = `
    <h2>${escapeHtml(collection.name)} catalog</h2>
    <ol>
      ${groups.map((group) => `
        <li>
          <a href="#${group.id}">
            ${escapeHtml(group.category.name)}
            <span class="rail__count">${group.scriptCount}</span>
          </a>
        </li>`).join('')}
    </ol>`;
  const body = `
    ${copy.intro}
    <ul class="stats">
      <li><b>${collection.totalScripts}</b> tweaks</li>
      <li><b>${collection.recommendationCounts.standard}</b> recommended</li>
      <li><b>${collection.recommendationCounts.strict}</b> strict</li>
      <li><b>${collection.recommendationCounts.none}</b> opt-in only</li>
      <li><b>${groups.length}</b> top-level groups</li>
    </ul>
    <a class="cta" href="/?os=${collection.slug}">
      Build a ${escapeHtml(collection.name)} script &rarr;
    </a>
    ${groups.map((group) => renderGroup(group)).join('')}`;
  return {
    path,
    html: renderPage({
      path,
      title: copy.metaTitle,
      description: copy.description,
      h1: copy.title,
      breadcrumb: [
        { name: 'privacy.sexy Revamped', path: '/' },
        { name: collection.name, path },
      ],
      extraJsonLd: [{
        '@type': 'ItemList',
        '@id': `https://privacy.turtlecute.org${path}#categories`,
        name: `${collection.name} script categories`,
        numberOfItems: groups.length,
        itemListElement: groups.map((group, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: group.category.name,
        })),
      }],
      rail,
      body,
    }),
  };
}

function renderGroup(group) {
  const sections = flattenCategory(group.category, []);
  return `
    <section class="group" id="${group.id}">
      <h2>${escapeHtml(group.category.name)}</h2>
      ${sections.map((section) => renderSection(section)).join('')}
    </section>`;
}

function renderSection({ path, scripts }) {
  const heading = path.length === 0 ? '' : `
    <p class="sub">
      ${path.map((name, index) => (index === path.length - 1
    ? escapeHtml(name)
    : `<span class="sub__path">${escapeHtml(name)} &rsaquo; </span>`)).join('')}
    </p>`;
  return `
    ${heading}
    <ul class="items">
      ${scripts.map((script) => `
        <li>
          <span class="items__name">${escapeHtml(script.name)}</span>
          <span class="tag tag--${script.recommendation.key}">${script.recommendation.label}</span>
        </li>`).join('')}
    </ul>`;
}

/*
 * Depth-first walk that emits one flat list of scripts per category that has any, labelled with the
 * path that got there. The catalog nests up to five levels deep; rendering that as nested lists
 * produces a wall of indentation nobody reads, so the hierarchy becomes a breadcrumb above a flat
 * list instead.
 */
function flattenCategory(category, ancestors) {
  const sections = [];
  if (category.scripts.length > 0) {
    sections.push({ path: ancestors, scripts: category.scripts });
  }
  category.subCategories.forEach((subCategory) => {
    sections.push(...flattenCategory(subCategory, [...ancestors, subCategory.name]));
  });
  return sections;
}

function countScripts(category) {
  return category.scripts.length
    + category.subCategories.reduce((sum, sub) => sum + countScripts(sub), 0);
}

export function renderAlternativesPage(collections) {
  const path = '/privacy-sexy-alternatives/';
  const total = collections.reduce((sum, collection) => sum + collection.totalScripts, 0);
  const body = `
    <p class="lede">
      If you landed here looking for privacy.sexy and found something unfamiliar, or you are
      deciding between the tools in this category, this page is an honest comparison &mdash;
      including where this one loses.
    </p>

    <h2>What this fork is</h2>
    <p>
      privacy.sexy Revamped is an independently maintained fork of
      <a href="https://github.com/undergroundwires/privacy.sexy" rel="noopener nofollow">undergroundwires/privacy.sexy</a>,
      running at <a href="/">privacy.turtlecute.org</a>. It keeps the original idea &mdash; pick
      the changes you want, read the exact commands, run the script yourself &mdash; and updates
      the catalog against current vendor documentation. It carries ${total} tweaks across
      ${collections.map((collection) => `${collection.totalScripts} ${collection.name}`).join(', ')}.
    </p>
    <p>
      The upstream project's last catalog release was <b>0.13.8 on 13 March 2025</b> and its last
      commit to <code>master</code> was <b>18 April 2025</b>. It is still online and its
      repository is not archived. This fork exists to keep the catalog current past that point,
      and it is not affiliated with the original author.
    </p>
    <div class="note">
      <b>The honest version:</b> this fork is young and has a small number of contributors. If
      you want the largest community, the longest track record, or a desktop application, one of
      the tools below is a better answer than this one.
    </div>

    <h2>The alternatives, and when to pick them</h2>

    <h3>PrivacyLearn</h3>
    <p>
      <a href="https://privacylearn.com/" rel="noopener nofollow">privacylearn.com</a> is by the
      original privacy.sexy author. It publishes the script documentation as a browsable
      reference with sources and revert notes for each tweak. <b>Pick it</b> when you want to
      understand a single setting in depth rather than generate a script &mdash; it is the better
      reference for the original documentation, because it is the original documentation.
    </p>

    <h3>O&amp;O ShutUp10++</h3>
    <p>
      A free Windows desktop application with a long history and a large user base.
      <b>Pick it</b> if you want a graphical toggle list with an undo button and do not want to
      run a script. <b>Against it:</b> it is closed source, Windows only, and you cannot read
      what a toggle does before you flip it.
    </p>

    <h3>Win11Debloat (Raphire)</h3>
    <p>
      A widely used PowerShell script for stripping preinstalled Windows apps and switching off
      the noisier Windows 11 features. <b>Pick it</b> for a fast, opinionated one-shot debloat.
      <b>Against it:</b> it is a script with flags rather than a catalog, so there is no
      per-tweak documentation and no revert for most of what it does.
    </p>

    <h3>WinUtil (Chris Titus Tech)</h3>
    <p>
      A PowerShell GUI bundling debloating, tweaks, application installation and Windows Update
      controls. <b>Pick it</b> if you want one tool that also installs your software and repairs
      a system. <b>Against it:</b> its scope is much wider than privacy, and the tweak
      descriptions are terse.
    </p>

    <h3>WinScript</h3>
    <p>
      <a href="https://winscript.cc/" rel="noopener nofollow">winscript.cc</a> is the closest
      direct comparison: a browser-based builder that generates a Windows script from checkboxes.
      <b>Pick it</b> for a lighter, faster interface. <b>Against it:</b> Windows only, and it
      does not document each tweak or offer per-tweak revert commands.
    </p>

    <h3>Sophia Script</h3>
    <p>
      A large, carefully maintained PowerShell module for Windows 10 and 11.
      <b>Pick it</b> if you are comfortable in PowerShell and want the most granular control
      available. <b>Against it:</b> there is no interface &mdash; you edit a preset file.
    </p>

    <h2>How this fork differs from upstream privacy.sexy</h2>
    <p>
      The catalogs share most of their scripts, so the differences are editorial:
    </p>
    <ul>
      <li>
        <b>Recommendations were tightened.</b> A large number of scripts upstream recommended are
        now <b>Opt-in only</b> here, and none were promoted the other way. Tweaks that disable
        antivirus, SmartScreen, code signing, authentication, recovery or updates are documented
        but never recommended.
      </li>
      <li>
        <b>Obsolete scripts were removed or fixed.</b> Retired policy paths, tools such as
        <code>wmic</code>, and registry keys and file paths that no longer exist on supported
        Windows versions.
      </li>
      <li>
        <b>Modern Windows AI controls were added</b> &mdash; Recall, Click to Do, the Copilot
        app, and Copilot in Edge.
      </li>
      <li>
        <b>The desktop application was dropped.</b> Upstream shipped an Electron app; this fork
        is web only, so there is nothing to install and nothing to update.
      </li>
    </ul>
    <p>
      Browse what that adds up to per platform:
      ${collections.map((collection) => `<a href="/${collection.slug}/">${collection.name}</a>`).join(', ')}.
    </p>
    <a class="cta" href="/">Build a script &rarr;</a>`;
  return {
    path,
    html: renderPage({
      path,
      title: 'privacy.sexy alternatives and forks, compared honestly | privacy.sexy Revamped',
      description:
        'An honest comparison of privacy.sexy, this maintained fork, PrivacyLearn, '
        + 'O&O ShutUp10++, Win11Debloat, WinUtil, WinScript and Sophia Script — including where '
        + 'each one loses.',
      h1: 'privacy.sexy alternatives and forks',
      breadcrumb: [
        { name: 'privacy.sexy Revamped', path: '/' },
        { name: 'Alternatives', path },
      ],
      body,
    }),
  };
}
