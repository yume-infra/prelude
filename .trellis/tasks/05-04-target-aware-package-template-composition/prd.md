# PRD-4: Target-Aware Package And Template Composition

## Goal

Make package manifest contributions, template registries, generated target paths, ownership traces, and PlanSpec projection target-aware for root files and nested workspace packages.

## Dependencies

* Requires PRD-1 accepted.
* Requires PRD-3 accepted.
* PRD-5 depends on this task.

## Requirements

* Extend package manifest contribution logic so root and child package manifests can be generated independently.
* Add target-aware package manifest paths, such as root `package.json`, `apps/<name>/package.json`, and `libs/<name>/package.json`.
* Add template scope filtering:
  * `root`,
  * `package`,
  * `both`.
* Ensure root-only templates are not repeated inside child apps/libs.
* Ensure package-only runtime dependencies are not installed at the root by accident.
* Preserve ownership traces across root/package/capability boundaries.
* Ensure duplicate-path and manifest-conflict errors work with nested paths.

## Acceptance Criteria

* [ ] Root and child `package.json` files can be generated independently in a plan.
* [ ] Root-only templates such as lint config, Git hooks, workspace orchestration, and root package manager files are filtered out of child packages.
* [ ] Ownership traces distinguish workspace root, frontend package, Node/CLI package, library package, and capability owners.
* [ ] PlanSpec projection includes nested package paths deterministically.
* [ ] Tests cover nested duplicate paths and package manifest conflicts.

## Validation

* `pnpm --filter create-yume test -- package-manifest`
* `pnpm --filter create-yume test -- planner`
* `pnpm --filter create-yume test -- preview`
* `pnpm --filter create-yume typecheck`

## Likely Files

* `apps/cli/src/core/modifier/package-manifest-contributions.ts`
* `apps/cli/src/core/modifier/package-json.ts`
* `apps/cli/src/schema/template-registry.ts`
* `apps/cli/src/core/template-registry/`
* `apps/cli/src/core/services/plan/build.ts`
* `apps/cli/tests/core/modifier/`
* `apps/cli/tests/planner.spec.ts`

## Out of Scope

* Product-specific monorepo package generation.
* Existing workspace append/update mode.
* Replacing the stable PlanService execution core.

## Parallelization Notes

Target-aware manifest collection, template scope filtering, and PlanSpec projection tests can split if the target/scope interface is agreed first.
