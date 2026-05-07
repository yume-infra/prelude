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

## Definition of Done

* Target-aware package manifest contracts are implemented with deterministic target paths.
* Template registry entries can declare root/package/both scope without duplicating root-owned files into child packages.
* PlanSpec and dry-run ownership traces remain serializable and explain root/package ownership.
* Focused package-manifest, planner, preview, and typecheck validation passes.

## Technical Approach

* Treat `targetPath` as the shared contract for root and child package manifests. The root target remains `package.json`; child package manifests use nested paths such as `apps/web/package.json` or `libs/ui/package.json`.
* Keep `package.json` as a structured JSON/text mutation hotspot. Owners contribute package manifest fragments with provenance; the collector merges, dedupes, sorts, and reports conflicts per target path.
* Add template scope metadata at the registry boundary so assembly can filter `root`, `package`, and `both` entries before plan tasks are built. This reserves the target-aware contract for PRD-5 without introducing workspace child package generation in this task.
* Preserve `PlanService`, `PlanSpec`, template rendering, filesystem, and rollback behavior as stable execution core boundaries.

## Research Notes

* `apps/cli/src/core/modifier/package-manifest-contributions.ts` already owns package manifest ordering, same-value dedupe, provenance, and owner-aware conflicts, so target path should live there instead of in `PlanService`.
* `apps/cli/src/core/modifier/package-json.ts` is the production bridge from collected package contributions to JSON reducers; it is the right place for a reusable target-aware package manifest builder.
* `apps/cli/src/core/services/compose.ts` is the single template registry assembly point, so registry scope filtering can be applied before render tasks are registered.
* `apps/cli/src/core/template-registry/workspace-bootstrap.ts` contains root-only lint, Git, code-quality, and workspace orchestration templates that must be excluded from child package targets.
* `apps/cli/src/core/services/plan/build.ts` already projects task paths deterministically into `PlanSpec`; nested paths only need to enter as normal task paths.

## Decision (ADR-lite)

**Context**: PRD-4 must make root and nested package generation safe before PRD-5 composes mixed workspaces.

**Decision**: Use target-aware contribution and registry metadata instead of special-casing monorepo behavior in the stable plan execution core.

**Consequences**: Conflict diagnostics and ownership traces become path-specific, while workspace child package product flows remain deferred to PRD-5.

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
