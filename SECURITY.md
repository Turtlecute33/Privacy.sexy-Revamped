# Security policy

debloat.net builds scripts that change system settings, so its own security matters as much as
the scripts it generates. Thank you for reporting problems responsibly.

## Reporting a vulnerability

- **Sensitive issues:** use
  [private vulnerability reporting](https://github.com/Turtlecute33/Debloat.net/security/advisories/new).
  Only the maintainer can see the report. Please do not post details publicly until a fix ships.
- **Everything else**, such as a script that weakens security by mistake:
  [open an issue](https://github.com/Turtlecute33/Debloat.net/issues/new/choose).

Only the latest version, the one live on [debloat.net](https://debloat.net), receives fixes.

## What happens next

1. The report is confirmed and the affected parts are identified.
2. Impact and severity are assessed.
3. A fix is released, and you are kept informed along the way.

## How the site protects you

- **No backend.** debloat.net is a static site. Your selections and the scripts built from them
  stay in your browser, and a script is saved through a normal browser download.
- **No execution.** The site only generates script files. It never runs them and never asks for
  elevated privileges. You review the script and decide whether to run it.
- **Strict Content Security Policy.** Following OWASP guidance, the page can load scripts only
  from its own origin and the analytics host below, which protects against cross-site scripting
  and data injection.
- **Safe links.** External links cannot access the page that opened them, and no referrer is
  sent.
- **Minimal third parties.** The only request beyond the site's own files is a cookie-free page
  count to a self-hosted Umami instance. There are no ads, third-party trackers, or CDN scripts.

## Build and release integrity

Every commit merged to `master` is tested, built from source, and deployed by GitHub Actions,
with no manual step in between. The site you use always matches the published source code.
See the [CI/CD documentation](./docs/ci-cd.md) and the [testing documentation](./docs/tests.md).
