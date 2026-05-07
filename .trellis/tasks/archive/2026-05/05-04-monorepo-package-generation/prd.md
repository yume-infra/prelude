# PRD-5: Monorepo Package Generation

## Goal

Generate supported package kinds inside pnpm workspaces using `apps/*` for runnable apps/tools and `libs/*` for shared libraries, with explicit `workspace:*` dependency links.

## Dependencies

* Requires PRD-2 accepted.
* Requires PRD-3 accepted.
* Requires PRD-4 accepted.

## Requirements

* Generate frontend apps under `apps/*`.
* Generate backend/worker/CLI apps under `apps/*` as package kinds become available.
* Generate library packages under `libs/*`.
* Support structured spec package lists.
* Support interactive package selection only after package kinds have stable config shapes.
* Emit explicit internal workspace dependencies as `workspace:*`.
* Do not auto-link every local package to every app.
* Preserve root-vs-child command semantics.
* Keep generated workspace append-ready, even though updating existing workspaces remains out of scope.

## Acceptance Criteria

* [ ] A workspace can contain at least one supported frontend app under `apps/*`.
* [ ] A workspace can contain at least one Node/CLI app under `apps/*`.
* [ ] A workspace can contain at least one library package under `libs/*`.
* [ ] Mixed frontend + Node/CLI/library workspaces have correct root and child package manifests.
* [ ] Declared internal dependencies are emitted as `workspace:*`.
* [ ] Undeclared local packages are not linked implicitly.
* [ ] Dry-run shows root files and child package files/actions clearly.

## Validation

* `pnpm --filter create-yume test -- planner`
* `pnpm --filter create-yume test -- template-render`
* `pnpm --filter create-yume test -- generated`
* `pnpm --filter create-yume typecheck`
* Add mixed workspace smoke cases once templates are concrete.

## Likely Files

* `apps/cli/src/schema/project-config.ts`
* `apps/cli/src/core/questions/compose.ts`
* `apps/cli/src/core/services/compose.ts`
* `apps/cli/src/core/template-registry/`
* `apps/cli/src/core/modifier/package-json.ts`
* `apps/cli/templates/fragments/`
* `apps/cli/tests/generated-projects.smoke.ts`
* `apps/cli/tests/linked-examples.smoke.ts`

## Out of Scope

* Existing workspace append/update command.
* npm/yarn/bun workspaces.
* Serverless deployment packaging.
* Library publishing/versioning.

## Parallelization Notes

Frontend retargeting, Node/CLI retargeting, and library package generation can run in separate worktrees after PRD-4 if their write scopes are disjoint.
