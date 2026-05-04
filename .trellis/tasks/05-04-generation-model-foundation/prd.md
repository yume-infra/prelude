# PRD-1: Generation Model Foundation

## Goal

Introduce the generation model foundation that lets create-yume describe standalone projects, future workspaces, structured create spec input, runtime inference/validation, and explicit internal dependency links without changing existing React/Vue generated output.

## Dependencies

* Parent roadmap: `.trellis/tasks/05-04-monorepo-node-cli-support/prd.md`.
* This task is the first serial implementation phase. Downstream PRDs must not start implementation until this task is accepted.

## Requirements

* Split the current frontend-only `ProjectConfig` concept into a broader generation model while preserving compatibility for current React/Vue configs.
* Model `shape: 'standalone' | 'workspace'`.
* Model package kinds: `frontend-app`, `backend-app`, `worker-app`, `cli-tool`, `library-package`.
* Add runtime inference and validation:
  * `frontend-app` infers browser.
  * `backend-app`, `worker-app`, and `cli-tool` infer node.
  * `library-package` may be neutral or node.
* Add package-kind-specific framework/toolkit fields instead of one global framework field.
* Add a structured create spec schema as the canonical future non-interactive input boundary.
* Add internal workspace dependency link schema by package id/name, but do not implement workspace generation yet.
* Preserve existing preset, prompt, decode, dry-run, and planner snapshot behavior for React/Vue.

## Acceptance Criteria

* [ ] Existing React/Vue project configs decode unchanged or through a documented compatibility adapter.
* [ ] Existing React/Vue planner snapshots and question tests remain green.
* [ ] Create spec schema exists and rejects invalid runtime/package kind combinations.
* [ ] Runtime is inferred or validated without burdening simple prompts/flags.
* [ ] Workspace package specs can declare internal dependency links for later `workspace:*` emission.
* [ ] Docs/agent constraints describe the new taxonomy without claiming unsupported product behavior is already implemented.

## Validation

* `pnpm --filter create-yume test -- schema`
* `pnpm --filter create-yume test -- core/questions`
* `pnpm --filter create-yume test -- planner`
* `pnpm --filter create-yume typecheck`

## Likely Files

* `apps/cli/src/schema/project-config.ts`
* `apps/cli/src/schema/preset.ts`
* `apps/cli/src/schema/cli-args.ts`
* `apps/cli/src/core/questions/compose.ts`
* `apps/cli/src/core/questions/project-type.ts`
* `apps/cli/src/utils/type-guard.ts`
* `apps/cli/tests/schema/`
* `apps/cli/tests/core/questions/`
* `docs/agent/constraint/architecture.md`
* `docs/user/system-architecture.md`

## Out of Scope

* Generating Node/CLI templates.
* Generating workspace roots.
* Changing existing React/Vue output shape.
* Dispatching child workspace package generation.

## Parallelization Notes

This phase is serial at the roadmap level. Within the phase, schema/runtime validation and prompt/preset refactor can split only after the taxonomy contract is fixed.
