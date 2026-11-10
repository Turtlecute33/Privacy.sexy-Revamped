# CI/CD overview

## GitOps

CI/CD is automated using Git events and GitHub Actions. The
[`deploy.pages.yaml`](./../.github/workflows/deploy.pages.yaml) workflow builds
the web application and deploys it to GitHub Pages.

Everything that's merged in the master goes directly to production, once its unit and
integration tests pass.

## Workflows

| Workflow | Runs | Checks |
| --- | --- | --- |
| [`ci`](./../.github/workflows/ci.yaml) | Every branch push and pull request, Ubuntu only | Linting, unit and integration tests, production build, E2E tests |
| [`deploy.pages`](./../.github/workflows/deploy.pages.yaml) | Every push to `master` | Tests again, then builds, prerenders, and publishes the site |
| [`checks.security.sast`](./../.github/workflows/checks.security.sast.yaml) | Every branch push and pull request, weekly | CodeQL static analysis |
| [`checks.security.dependencies`](./../.github/workflows/checks.security.dependencies.yaml) | When `package.json` or the lockfile changes, weekly | `npm audit` of production dependencies |
| [`checks.external-urls`](./../.github/workflows/checks.external-urls.yaml) | Weekly, on demand | Links in the script documentation and Markdown files |
| [`checks.cross-platform`](./../.github/workflows/checks.cross-platform.yaml) | Weekly, on demand, when Docker files change | Tests and builds on macOS and Windows, the Docker image |
| [`checks.scripts`](./../.github/workflows/checks.scripts.yaml) | When the tooling scripts change, on demand | Developer tooling scripts on every OS (17 jobs) |
| [`checks.windows-scripts`](./../.github/workflows/checks.windows-scripts.yaml) | On demand | Every Windows script, applied and reverted on Windows 11 and Windows Server 2025 (21 jobs, about an hour) |

What runs on every push is kept fast and deterministic: one OS, and no check that depends on
third-party websites. Link checks and cross-platform runs are weekly, where a site that is down or
rate-limits GitHub's runners cannot fail an unrelated commit. Run any of them on demand from the
repository's *Actions* tab.

Pushing a release tag starts nothing: the tag points at a commit its branch push already checked.
Every push trigger is limited to branches for this reason, because GitHub ignores `paths` filters
on tag pushes and would otherwise run the path-filtered checks on every release.

[![CI/CD using GitHub Actions](./../img/architecture/gitops.png)](../.github/workflows/)

## Pipeline files

debloat.net uses [GitHub Actions](https://github.com/features/actions) to define and run pipelines as code.

GitHub workflows i.e. pipelines exist in [`/.github/workflows/`](./../.github/workflows/) folder without any subfolders due to GitHub actions requirements [1] .

Local GitHub actions are defined in [`/.github/actions/`](./../.github/actions/) and used to reuse same workflow steps.

## Naming conventions

Sub-folders do not work for GitHub workflows [1], so file names carry a type prefix instead:
**`<type>.<name>.yaml`**, usually with the same text, minus `.yaml`, as the workflow's `name`.

- `checks`: controls such as vulnerability scans, link checks, or cross-platform runs.
- `deploy`: publishing the site.

[`ci.yaml`](./../.github/workflows/ci.yaml) is the one exception: it is the pipeline that runs on
every push.

[1]: https://web.archive.org/web/20250126141528/https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#about-yaml-syntax-for-workflows "Workflow syntax for GitHub Actions - GitHub Docs | docs.github.com"
