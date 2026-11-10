# Contributing

Thanks for helping improve debloat.net. Bug reports, script research, documentation fixes, and
pull requests are all welcome. This is a small project, so replies can take a while.

## Ways to help

- **Report a bug.** If a tweak fails, breaks something, or its documentation is wrong,
  [open an issue](https://github.com/Turtlecute33/Privacy.sexy-Revamped/issues/new/choose).
  Include your OS version and, if you can, the generated script.
- **Suggest a script.** Use the *New script* issue template and link vendor documentation.
- **Send a pull request.** The fastest way to get a fix or a new script in.

## Adding or changing scripts

1. Read the [script guidelines](./docs/script-guidelines.md).
2. Edit the collection for your OS in [`src/application/collections/`](./src/application/collections/).
   The syntax is described in [collection-files.md](./docs/collection-files.md).
3. Cite high-quality sources, ideally vendor documentation, and say what the tweak may break.
4. Provide revert code whenever the change can be undone.

## Pull request process

The project uses [GitHub flow](https://web.archive.org/web/20250317121135/https://docs.github.com/en/get-started/using-github/github-flow).

1. Fork the repository and branch from `master`.
2. Add tests for code changes. See [tests.md](./docs/tests.md).
3. Update the [documentation](./docs/) for major changes.
4. Make sure tests and linters pass. See [development.md](./docs/development.md#testing).
5. Open the pull request and explain **why** the change is needed, not only what it does.

Do not change the version in `package.json`; the maintainer sets it when releasing.

Automated checks run on every pull request. After a merge, `master` is tested, built, and
deployed to [debloat.net](https://debloat.net) automatically. See [ci-cd.md](./docs/ci-cd.md).

## Commit conventions

- Follow the 50/72 rule: titles up to 50 characters, body lines up to 72, except code.
- Write the title in the imperative mood ("add", not "added") and summarize what the commit does.
- Explain why and how in the body. Do not list changed files or paste diffs.
- Prefix bug fixes with `fix:`.
- Prefix script changes with the OS they affect: `win:`, `mac:`, or `linux:`. Combine them for
  several systems, for example `win, mac: ...`.

## Versioning

Versions follow the content of a release rather than strict semantic versioning:

- **Patch** (`0.0.x`): bug fixes, small UI improvements, refactoring, dependency and
  documentation updates, recommendation-level changes, and splitting or improving scripts.
- **Minor** (`0.x.0`): changes to how people use the site, such as major UI work, new scripts, or
  new features.

The maintainer bumps the version, tags the release as `v<version>`, and publishes it on
[GitHub Releases](https://github.com/Turtlecute33/Privacy.sexy-Revamped/releases), with notes in
[CHANGELOG.md](./CHANGELOG.md).

## Refactoring

Opportunistic refactoring is welcome. When you fix a bug or add a feature, feel free to clean up
the code around it, and leave it better than you found it.

## License

By contributing to this project, you agree that your contributions are licensed under the [GNU Affero General Public License](./LICENSE) as currently specified. Additionally, you expressly consent to the project maintainers having full authority to modify the licensing terms or relicense your contributions under different terms in the future.
