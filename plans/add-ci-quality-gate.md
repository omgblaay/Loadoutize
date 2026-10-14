# Add an automated CI quality gate

## Objective

Run the Loadoutize unit tests and production build automatically for every pull request and relevant branch push, so regressions are detected before changes are merged.

## Context

The repository now exposes `npm test` for the Vitest suite and `npm run build` for the Vite production bundle, but it has no committed CI workflow. Test-related documentation is also stale: `README.md`, `PROJECT.md`, and `docs/ARCHITECTURE.md` still state that no automated test suite exists.

This task assumes the current Vitest configuration and unit tests are committed before, or together with, the CI workflow.

## Requirements

- Add a GitHub Actions workflow under `.github/workflows/` that runs on pull requests and pushes to the repository's primary integration branch.
- Use a maintained Node.js LTS release and install dependencies reproducibly with `npm ci`.
- Enable npm dependency caching through the Node setup action.
- Run these quality gates as separate, clearly named steps:
  - `npm test`
  - `npm run build`
- Grant the workflow only the read permissions required to check out and build the repository.
- Cancel superseded runs for the same pull request or branch to avoid wasting CI capacity.
- Keep the workflow independent of Supabase credentials and other deployment secrets; the existing unit tests and frontend build must remain safe to run in an untrusted pull-request context.
- Update `README.md`, `PROJECT.md`, and `docs/ARCHITECTURE.md` so their testing instructions match the committed commands and no longer claim that the project has no test suite.
- Document the local equivalents of every CI check so contributors can reproduce failures before pushing.

## Out of scope

- Adding linting, coverage thresholds, browser/end-to-end tests, or a full TypeScript type-check command.
- Deploying preview or production builds.
- Changing application behavior or expanding the current unit-test scope.
- Configuring GitHub branch-protection rules, which is repository administration rather than a code change.

## Acceptance criteria

- [ ] A pull request triggers the workflow without requiring repository secrets.
- [ ] A push to the primary integration branch triggers the same quality gates.
- [ ] The workflow installs the exact dependency tree from `package-lock.json` using `npm ci`.
- [ ] All committed Vitest tests run non-interactively and a failing test fails the workflow.
- [ ] `npm run build` runs and a bundling failure fails the workflow.
- [ ] Concurrent runs for an older revision of the same pull request or branch are cancelled.
- [ ] Workflow permissions are explicitly read-only unless a stronger permission is demonstrably required.
- [ ] `README.md`, `PROJECT.md`, and `docs/ARCHITECTURE.md` accurately describe `npm test`, `npm run test:watch`, and the CI checks.
- [ ] The workflow YAML is valid and appears under the repository's GitHub Actions checks.

## Verification

1. Run `npm ci` from a clean dependency state.
2. Run `npm test` and confirm the complete suite passes in non-watch mode.
3. Run `npm run build` and confirm the production bundle succeeds.
4. Open a pull request containing the workflow and confirm both quality-gate steps pass without secrets.
5. Temporarily introduce a failing assertion on the pull-request branch, verify that the test step fails, and revert the assertion before merging.
6. Push a follow-up commit while the earlier run is active and confirm the superseded run is cancelled.

## Assumption

GitHub is the canonical remote and GitHub Actions is the intended CI provider. If the repository uses another provider or a different primary integration branch, adapt the workflow trigger while preserving the same quality gates.
