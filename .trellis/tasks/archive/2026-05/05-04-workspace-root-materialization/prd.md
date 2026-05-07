# PRD-3: Workspace Root Materialization

## Goal

Add pnpm workspace root materialization with root files, root package manifest policy, package-manager command policy, dry-run preview, and rollback support.

## Dependencies

* Requires PRD-1 accepted.
* Can run in parallel with PRD-2 after PRD-1.
* PRD-4 depends on this task.

## Requirements

* Add a workspace root config model that does not require child package generation yet.
* Generate workspace root files:
  * `package.json`,
  * `pnpm-workspace.yaml`,
  * `turbo.json`.
* Use `apps/*` and `libs/*` in generated `pnpm-workspace.yaml`.
* Keep the initial roadmap pnpm-only.
* Centralize package-manager commands/policy instead of scattering raw `pnpm` command strings.
* Root `package.json` owns workspace-level dev tooling and orchestration dependencies.
* Child package manifests are out of scope for this phase.
* Dry-run must preview root files and commands without writing.
* Rollback must clean up generated workspace root paths on failure.

## Acceptance Criteria

* [ ] Minimal workspace root can be planned, previewed, generated, and rolled back.
* [ ] Root `pnpm-workspace.yaml` includes `apps/*` and `libs/*`.
* [ ] Root `package.json` is clearly root-owned and separate from future child manifests.
* [ ] Root package-manager policy/helper exists for install/exec/root commands.
* [ ] Dry-run output clearly shows root-level files and root-level post-generate actions.

## Validation

* `pnpm --filter create-yume test -- planner`
* `pnpm --filter create-yume test -- dry-run`
* `pnpm --filter create-yume test -- rollback`
* `pnpm --filter create-yume typecheck`

## Likely Files

* `apps/cli/src/schema/project-config.ts`
* `apps/cli/src/core/workspace-bootstrap.ts`
* `apps/cli/src/core/template-registry/workspace-bootstrap.ts`
* `apps/cli/src/core/modifier/package-json.ts`
* `apps/cli/src/core/services/compose.ts`
* `apps/cli/templates/fragments/common/`
* `apps/cli/tests/core/services/`
* `apps/cli/tests/dry-run-cli.smoke.ts`

## Out of Scope

* Generating child apps/libs.
* Supporting npm/yarn/bun workspaces.
* Adding packages to an existing workspace.

## Parallelization Notes

Root package manifest work, package-manager policy, and root template work can split after the workspace root schema is stable.
