# Tests

There are different types of tests executed:

1. [Unit tests](#unit-tests)
2. [Integration tests](#integration-tests)
3. [End-to-end (E2E) tests](#e2e-tests)
4. [Automated checks](#automated-checks)

## Unit and integration tests

- They utilize [Vitest](https://vitest.dev/).
- Test files are suffixed with `.spec.ts`.

### Act, arrange, assert

- Tests implement the act, arrange, and assert (AAA) pattern.
- **Arrange**
  - Sets up the test scenario and environment.
  - Begins with comment line `// arrange`.
- **Act**
  - Executes the actual test.
  - Begins with comment line `// act`.
- **Assert**
  - Sets an expectation for the test's outcome.
  - Begins with comment line `// assert`.

### Unit tests

- Evaluate individual components in isolation.
- Located in [`./tests/unit`](./../tests/unit).
- Achieve isolation using stubs where you place:
  - Common stubs in [`./shared/Stubs`](./../tests/unit/shared/Stubs),
  - Component-specific stubs in same folder as test file.
- Include Vue component tests, enabled by `@vue/test-utils`.

#### Unit tests naming

- Test suites start with a description of the component or system under test.
  - E.g., tests for `Application.ts` are contained in `Application.spec.ts`.
- Whenever possible, `describe` blocks group tests of the same function.
  - E.g., tests for `run()` are inside `describe('run', () => ...)`.

### Integration tests

- Assess the combined functionality of components.
- They verify that third-party dependencies function as anticipated.

## E2E tests

- Examine the live web application's functionality and performance.
- Uses Cypress to run the tests.

## Automated checks

These checks validate various qualities like runtime execution, building process, security testing, etc.

- Use [various tools](./../package.json) and [scripts](./../scripts).
- Are automatically executed as [GitHub workflows](./../.github/workflows). See
  [ci-cd.md](./ci-cd.md#workflows) for which ones run on every push and which run weekly.

### Windows script check

[`checks.windows-scripts`](./../.github/workflows/checks.windows-scripts.yaml) runs every Windows script on real,
disposable Windows machines: GitHub's Windows 11 (ARM64) and Windows Server 2025 (x64) runners. The unit tests can
only parse the generated code; this check shows what the code does.

- [`generate.spec.ts`](./../tests/checks/windows-scripts/generate.spec.ts) writes each script as the batch file the
  site would hand to a visitor who selected only that script, once to apply it and once to revert it.
- [`run.ps1`](./../tests/checks/windows-scripts/run.ps1) applies each script twice and reverts it twice. Before and
  after every run it records the registry keys the script names, every service, every scheduled task and the hosts
  file, and it keeps the output with the error stream marked.
- [`summarize.mjs`](./../tests/checks/windows-scripts/summarize.mjs) turns the downloaded results into a report.

Start it from the *Actions* tab or with `gh workflow run checks.windows-scripts.yaml`, then:

```bash
gh run download <run id> --dir results
node tests/checks/windows-scripts/summarize.mjs results
node tests/checks/windows-scripts/summarize.mjs results --show 467 # everything recorded for script 467
```

The report lists scripts that timed out, wrote to the error stream, changed nothing that is watched, changed
something again on the second apply, or left the machine different after revert. Read it as leads, not verdicts:
the runner images already set some of the values the scripts set, their Defender is protected against changes, and
reinstalling removed Windows capabilities often runs into the time limit there. A finding that shows on both
machines, or that the script's own output explains, is the one to act on.

The check is not part of any push: it takes about an hour on twenty machines. Run it after changing a shared
function in [`windows.yaml`](./../src/application/collections/windows.yaml), and before a release that changes
Windows scripts.

### Security checks

- [`checks.security.sast`](./../.github/workflows/checks.security.sast.yaml): Utilizes CodeQL to conduct Static Analysis Security Testing (SAST) to ensure the secure integrity of the codebase.
- [`checks.security.dependencies`](./../.github/workflows/checks.security.dependencies.yaml): Performs audits on third-party dependencies to identify and mitigate potential vulnerabilities, safeguarding the project from exploitable weaknesses.

## Tests structure

- [`package.json`](./../package.json): Defines test commands and includes tools used in tests.
- [`vite.config.ts`](./../vite.config.ts): Configures `vitest` for unit and integration tests.
- [`./src/`](./../src/): Contains the code subject to testing.
- [`./tests/shared/`](./../tests/shared/): Contains code shared by different test categories.
  - [`bootstrap/setup.ts`](./../tests/shared/bootstrap/setup.ts): Initializes unit and integration tests.
  - [`Assertions/`](./../tests/shared/Assertions/): Contains common assertion functions, prefixed with `expect`.
- [`./tests/unit/`](./../tests/unit/)
  - Stores unit test code.
  - The directory structure mirrors [`./src/`](./../src).
  - [`shared/`](./../tests/unit/shared/)
    - Contains shared unit test functionalities.
    - [`TestCases/`](./../tests/unit/shared/TestCases/)
      - Shared test cases.
      - Functions that calls `it()` from [Vitest](https://vitest.dev/) should have `it` prefix.
    - [`Stubs/`](./../tests/unit/shared/Stubs): Maintains stubs for component isolation, equipped with basic functionalities and, when necessary, spying or mocking capabilities.
- [`./tests/integration/`](./../tests/integration/): Contains integration test files.
- [`cypress.config.ts`](./../cypress.config.ts): Cypress (E2E tests) configuration file.
- [`cypress-dirs.json`](./../cypress-dirs.json): A central definition of directories used by Cypress, designed for reuse across different configurations.
- [`./tests/e2e/`](./../tests/e2e/): Base Cypress folder, includes tests with `.cy.ts` extension.
  - [`/tsconfig.json`]: TypeScript configuration for file Cypress code, improves IDE support, recommended to have by official documentation.
  - *(git ignored)* `/videos`: Asset folder for videos taken during tests.
  - *(git ignored)* `/screenshots`: Asset folder for Screenshots taken during tests.
  - [`/support/e2e.ts`](./../tests/e2e/support/e2e.ts): Support file, runs before every single test file.
  - [`/support/interactions/`](./../tests/e2e/support/interactions/): Contains reusable functions for simulating user interactions, enhancing test readability and maintainability.
