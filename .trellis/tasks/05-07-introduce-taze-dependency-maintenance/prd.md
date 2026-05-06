# Introduce Taze Dependency Maintenance

## Goal

Install and pin `taze` as a project dependency so dependency freshness checks are reproducible, then expose the same maintenance workflow in generated projects without making dependency freshness part of the normal verification gate.

## What I Already Know

- The user prefers installing `taze` in the project instead of relying on `pnpm dlx`.
- The current repo uses pnpm catalogs for external dependency versions.
- The current repo has `outdated`, `deps`, and `deps:latest` scripts backed by pnpm.
- Generated projects already receive maintenance tooling through `workspaceBootstrapMaintenanceDevDependencies` and `workspaceBootstrapMaintenanceScripts`.
- `taze@19.11.0` is the current npm version.

## Requirements

- Add `taze` to the root workspace dependency catalog and root `devDependencies`.
- Add root scripts for taze-based dependency checks and controlled range updates.
- Keep `taze` out of `verify` / `verify:code`.
- Add `taze` to generated project maintenance dev dependencies.
- Add generated scripts for standalone projects and workspace roots, using recursive taze commands only for generated workspace roots.
- Preserve existing `knip` maintenance behavior.

## Acceptance Criteria

- [x] Root `package.json` has reproducible taze scripts and `taze: "catalog:"`.
- [x] `pnpm-workspace.yaml` catalog contains `taze`.
- [x] Generated standalone package manifests include taze maintenance scripts without `-r`.
- [x] Generated workspace root manifests include taze maintenance scripts with `-r`.
- [x] Tests/snapshots cover generated package manifest changes.
- [x] Focused verification passes.

## Definition of Done

- Specs and user docs sync has been considered.
- A focused test set covering root manifest policy and generated output has run successfully.
- Root lockfile has been updated through pnpm.

## Technical Approach

Reuse the existing maintenance-tool contribution path in `apps/cli/src/core/workspace-bootstrap.ts`. Add taze dev dependency and script constants alongside knip, with command selection based on standalone versus workspace-root generation. Keep dependency freshness checks opt-in/manual rather than part of build/test/lint verification.

## Decision (ADR-lite)

Context: `pnpm outdated -r` can report stale packages, but taze provides a richer dependency freshness workflow for catalogs, monorepos, package manager fields, maturity windows, and controlled semver bump modes.

Decision: Install `taze` as a pinned project dev dependency and emit it into generated maintenance tooling. Use `deps:check`, `deps:check:all`, and `deps:fresh` scripts. `deps:fresh` uses `minor` mode plus a seven-day maturity period.

Consequences: Dependency maintenance becomes reproducible and easier to run, but remains a human-triggered workflow instead of an always-on verification failure.

## Out of Scope

- Running dependency upgrades in this task.
- Adding CI automation for scheduled dependency freshness checks.
- Changing generated project dependency versions unrelated to adding taze.
- Replacing existing pnpm `outdated` / `deps` scripts unless needed by tests.

## Technical Notes

- Relevant specs: repository, template-system, workspace-packages, verification.
- Existing maintenance precedent: `knip` is contributed through `workspaceBootstrapMaintenanceDevDependencies` and `workspaceBootstrapMaintenanceScripts`.
- Pre-modification search covered `taze`, dependency scripts, `knip`, and workspace maintenance constants.
