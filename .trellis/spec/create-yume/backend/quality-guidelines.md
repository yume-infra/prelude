# Quality Guidelines

> Code standards and forbidden patterns for the CLI runtime.

---

## Overview

Quality in `create-yume` means preserving the stable scaffold execution core while keeping new behavior visible through schemas, owners, plan tasks, tests, and docs.

The codebase is Effect-native. Prefer local project patterns over generic Node scripts.

## Core Rules

- Preserve the stable core: `PlanService`, `PlanSpec`, `TemplateEngineService`, `FsService`, and rollback behavior.
- Keep responsibilities ownership-oriented: scaffold family owners, workspace/bootstrap owners, and capability owners.
- Use branded values for project names, target directories, template paths, command names, and package names.
- Use Effect services for reusable dependencies with clear implementation boundaries.
- Search before changing constants, config values, package versions, template helper names, or generated paths.

## Examples

- `apps/cli/src/core/owners/router.ts` centralizes router predicates, templates, and dependency contributions.
- `apps/cli/src/core/ownership/model.ts` represents contribution ownership instead of relying on comments.
- `apps/cli/src/core/services/template-engine.ts` owns helper and partial registration, so template runtime complexity does not leak into callers.
- `apps/cli/tests/core/services/plan/projection-boundary.test.ts` and `apps/cli/tests/core/services/preview-schema-integration.test.ts` protect the preview/serialization boundary.

## Testing Expectations

- Unit and contract tests use Vitest under `apps/cli/tests/`.
- Snapshot-style generated output coverage is in `planner.spec.ts` and `template-render.spec.ts`.
- Real generated project smoke tests are `generated-projects.smoke.ts`, `generated-lint-strategy.smoke.ts`, and `linked-examples.smoke.ts`.
- Follow `docs/agent/verification-matrix.md` for the minimum command. When unsure, run `pnpm verify`.

## Forbidden Patterns

- Do not add remote template loading, plugin systems, Node project scaffolds, or incremental update workflows.
- Do not bypass Effect services with direct filesystem or command calls in runtime logic.
- Do not duplicate dependency version maps across unrelated files; capability owners should own their contributions.
- Do not move tests back into `src`.
- Do not update user-visible generated behavior without checking docs and snapshots.

## Common Mistakes

- Treating template changes as isolated when they also require registry, package mutation, snapshot, and smoke coverage.
- Adding shared frontend config for behavior that is actually React-specific or Vue-specific.
- Forgetting that minimal presets are build-only while full presets are lint-enabled.
