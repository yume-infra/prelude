# Update Dependencies To Latest With Taze

## Goal

Use the repository's installed `taze` workflow to update all external dependencies in the pnpm catalog to their current latest registry versions, refresh the lockfile, and verify the workspace still builds and tests.

## What I Already Know

- The user asked to execute `taze` and update dependencies to the current latest versions.
- External dependency versions are centralized in `pnpm-workspace.yaml` through the pnpm catalog.
- Root and package manifests mostly reference external versions with `catalog:`.
- `taze` is an installed root dev dependency and dependency freshness checks are intentionally separate from `verify`.
- `updateConfig.ignoreDependencies` currently ignores `typescript`, but the user's request says all dependencies should move to latest.

## Requirements

- Run `taze` from the installed workspace dependency, not `pnpm dlx`.
- Update catalog versions to the current registry latest versions.
- Include dependencies currently ignored by default maintenance config when satisfying this one-off "all dependencies" request.
- Refresh `pnpm-lock.yaml` through pnpm install/update behavior.
- Preserve catalog centralization and avoid scattering explicit versions into package manifests.
- Do not update generated smoke output unless verification explicitly regenerates it as part of an accepted workflow.

## Acceptance Criteria

- [x] `pnpm-workspace.yaml` catalog reflects latest dependency versions reported by `taze`.
- [x] `pnpm-lock.yaml` is refreshed for the new catalog versions.
- [x] `package.json` / `apps/cli/package.json` continue to use `catalog:` references.
- [x] A post-update `taze` check reports no stale catalog dependencies in scope.
- [x] Focused or broad verification passes, or any remaining failures are documented with root cause.

## Definition Of Done

- Specs and user docs sync has been considered.
- Dependency changes are generated through tool commands rather than hand-edited version guessing.
- Verification evidence is recorded in the session summary.

## Out Of Scope

- Changing generated template dependency policies unless the dependency update requires it.
- Adding scheduled dependency automation.
- Publishing a release.
- Changing the package manager version unless the dependency tool explicitly treats it as part of dependency freshness.

## Technical Notes

- Relevant specs: repository and verification.
- Useful commands: `pnpm exec taze latest -r -w -i`, `pnpm exec taze latest -r --all`, `pnpm verify`.
- Pre-modification inspection covered `taze`, dependency scripts, package manifests, pnpm catalog, and task history for the previous taze introduction.
- `pnpm exec taze latest -r -w -i --include-locked --force` updated catalog versions, root `packageManager`, and `pnpm-lock.yaml`.
- The install exposed that `effect-language-service patch` looked for package-local `apps/cli/node_modules/typescript`; `apps/cli` now passes `--dir ../../node_modules/typescript` so the patch targets the workspace root TypeScript dependency under the updated pnpm layout.
- Post-update freshness check: `pnpm exec taze latest -r --all --include-locked` reported dependencies already up to date.
- Verification: `pnpm verify` passed, covering `pnpm --filter create-yume build`, `pnpm --filter create-yume test` (33 files / 300 tests), `pnpm lint`, and `pnpm knip`.

## Phase 3.3 Knowledge Sync

- `.trellis/spec/` update needed: no. The dependency centralization and taze workflow contracts remain valid; this task only applies the existing workflow and adjusts one package-local prepare command to the current workspace dependency layout.
- `.trellis/user/` update needed: no. No supported scope, package role, architecture map, reading order, or human-facing workflow changed.
