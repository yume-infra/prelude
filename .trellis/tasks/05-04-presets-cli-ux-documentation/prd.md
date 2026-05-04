# PRD-6: Presets CLI UX And Documentation

## Goal

Make the expanded product surface usable through presets, simple flags, structured `--spec` input, optional resolved spec export, non-interactive behavior, dry-run formatting, and synchronized docs.

## Dependencies

* Requires PRD-1 through PRD-5 accepted for full implementation.
* Some docs planning can start earlier, but final wording must wait for user-visible names and supported behavior.

## Requirements

* Define preset taxonomy for shape + package kind + framework/toolkit + engineering infrastructure capabilities.
* Preserve necessary flags for simple standalone/common usage.
* Add structured `--spec` usage docs and CLI help.
* Support `--spec <file-or-json>` as the canonical non-interactive input for complex workspace package graphs.
* Require `--name` with `--spec` so the target directory stays explicit while the create spec stays focused on package graph shape.
* Ensure non-interactive execution does not hang on prompts when required inputs are missing.
* Add `--no-input` as an explicit model/CI mode that fails clearly unless `--preset --name` or `--spec --name` is complete.
* Add resolved spec export:
  * interactive flow to resolved create spec,
  * preset/flags to resolved create spec,
  * spec input round-trip examples.
* Polish dry-run output so root files, child files, commands, and post-generate actions are auditable.
* Update user docs and agent constraints as each capability becomes supported.

## Acceptance Criteria

* [ ] Users can distinguish standalone and workspace flows from help text/docs.
* [ ] Presets encode shape and package kinds clearly.
* [ ] `--spec` examples are documented for LLM-driven invocation.
* [ ] Non-interactive mode fails clearly instead of prompting when input is incomplete.
* [ ] Resolved spec export exists, or this PRD records why export is intentionally deferred.
* [ ] Docs no longer claim shipped Node/CLI/monorepo capabilities are unsupported.

## Validation

* `pnpm --filter create-yume test -- cli-args`
* `pnpm --filter create-yume test -- dry-run`
* `pnpm --filter create-yume test -- phase-documentation-alignment`
* `pnpm --filter create-yume typecheck`

## Definition of Done

* CLI args, help text, create spec decoding, resolved spec export, dry-run preview, tests, and docs are aligned.
* Non-interactive execution has deterministic failure behavior for incomplete input.
* User docs describe shipped Node / CLI / workspace package capabilities without implying unsupported CLI flag graph UX.
* Agent constraints describe `--spec`, export, and dry-run boundaries.

## Technical Approach

* Keep `ProjectConfig` as the compatibility input consumed by the existing planner and template workflow.
* Decode `CreateSpec` at the CLI boundary, then adapt it into `ProjectConfig`; do not introduce a second generation workflow.
* Treat `--spec` values starting with `{` as inline JSON and all other values as file paths.
* Add `--print-spec` to emit the resolved create spec to stdout and exit before generation.
* Preserve simple preset flags for standalone/common flows; avoid adding nested workspace package flags.
* Dry-run remains human-readable and PlanSpec-backed, but groups root files and nested package files separately for auditability.

## Decision (ADR-lite)

**Context**: Complex workspace package graphs are too nested for CLI flags, but the planner still consumes `ProjectConfig`.

**Decision**: Ship `--spec <file-or-json> --name <target>` for structured non-interactive input, `--no-input` for explicit no-prompt execution, and `--print-spec` for resolved create spec export. The decoded spec is adapted into `ProjectConfig` before entering the existing Plan / PlanSpec workflow.

**Consequences**: The create spec remains the stable model-facing contract while target directory naming stays explicit. Full interactive package graph editing remains out of scope; future richer spec formats can extend the schema without changing the execution core.

## Likely Files

* `apps/cli/src/core/cli-args.ts`
* `apps/cli/src/core/cli-help.ts`
* `apps/cli/src/schema/cli-args.ts`
* `apps/cli/src/schema/preset.ts`
* `apps/cli/src/core/questions/compose.ts`
* `apps/cli/src/core/services/preview.ts`
* `docs/user/`
* `docs/agent/`
* `roadmap.md`

## Out of Scope

* Plugin/remote template UX.
* npm/yarn/bun workspace UX.
* Existing workspace update UX.

## Parallelization Notes

Help text/CLI args, prompt UX, spec export, dry-run formatting, and docs can split after preset taxonomy is fixed.
