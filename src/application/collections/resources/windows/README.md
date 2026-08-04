# Vendored deGDID resource

`degdid.ps1` is vendored from
[`yegors/deGDID` commit `068263f4`](https://github.com/yegors/deGDID/commit/068263f4fd9f1e6632c78c365b1a98027f6c2912).
The neighboring `degdid.LICENSE` contains its MIT license.

privacy.sexy embeds this source into generated batch scripts at build time. Generated scripts stay
self-contained and do not download executable code when users run them.

Local reliability adjustments:

- Credential-helper scheduled tasks are allowed to start and continue while running on battery,
  incorporating [upstream PR #4](https://github.com/yegors/deGDID/pull/4).
- Identity services are queried directly, ignoring missing optional services while failing closed on
  access errors. This incorporates the behavior and classification from
  [upstream PR #7](https://github.com/yegors/deGDID/pull/7).
- OMADM accounts count as MDM evidence only when backed by an active, server- or user-bound
  enrollment. This incorporates [upstream PR #9](https://github.com/yegors/deGDID/pull/9) and
  excludes Windows' built-in fake/local placeholder.
