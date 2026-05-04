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
* Ensure non-interactive execution does not hang on prompts when required inputs are missing.
* Consider a `--no-input`-style behavior for model/CI invocation.
* Add or defer resolved spec export explicitly:
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
