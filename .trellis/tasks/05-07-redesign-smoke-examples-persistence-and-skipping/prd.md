# Redesign Smoke Examples Persistence and Skipping

## Goal

Unify generated scaffold smoke verification around one visible, persistent examples output instead of maintaining separate temporary and linked-only flows. Keep smoke coverage useful, but make slow smoke runs avoidable when a change does not touch generated templates or generation behavior.

## What I Already Know

* The user wants "只做一套": do not keep one temporary full generated smoke matrix plus a separate linked examples set as the main mental model.
* `apps/examples/.generated/` is currently the visible examples output directory.
* `pnpm smoke:examples` runs `apps/cli/tests/linked-examples.smoke.ts`, which links the local CLI globally and generates only `react-full-linked` and `vue-full-linked` into `apps/examples/.generated/`.
* `pnpm --filter create-yume smoke:generated` runs `apps/cli/tests/generated-projects.smoke.ts`, which covers a broader preset/workspace matrix in a temp directory and removes it on success.
* Slow smoke tests should be skipped when the touched code/templates are unrelated to the demand being worked on.

## Assumptions

* The persistent examples directory should become the single place for generated smoke artifacts that users can inspect after a successful run.
* The full matrix does not need to run for every change; normal verification can rely on targeted smoke selection plus unit tests.
* Existing expected Tailwind CSS / Lightning CSS production-build warnings remain non-blocking when generated builds complete.

## Requirements

* Provide one primary generated smoke/examples flow instead of splitting "examples visible but narrow" and "generated broad but temp".
* Preserve useful coverage for representative React, Vue, Node, CLI, library, and workspace generation paths.
* Keep generated smoke artifacts in a stable, inspectable directory under `apps/examples/.generated/`.
* Add or document a fast skip/selection strategy so unrelated changes do not pay the full smoke cost.
* Keep failure diagnostics useful and preserve failed generated output for inspection.
* Update user-facing docs and scripts so contributors know which command to run.

## Acceptance Criteria

* [x] A primary smoke command generates its artifacts into `apps/examples/.generated/` and leaves them visible after success.
* [x] The old split between linked-only examples and temp-only full generated smoke is removed or clearly downgraded.
* [x] Contributors can run a targeted/changed smoke path instead of the full slow matrix when template/generation files relevant to the task did not change.
* [x] README and `apps/examples/README.md` describe the new smoke behavior and skipping guidance.
* [x] Existing unit tests for smoke helper contracts are updated if command behavior changes.

## Definition of Done

* Tests added or updated where behavior changes.
* Lint/typecheck relevant to touched code is green, or any inability to run them is recorded.
* Docs updated for changed commands or generated artifact locations.
* Smoke runtime impact considered explicitly.

## Out of Scope

* Replacing pnpm, Vite, ESLint, or scaffold build tooling.
* Adding remote CI-specific diff detection unless needed for the local command design.
* Expanding template feature coverage beyond existing presets/workspace examples.

## Technical Notes

* Root scripts expose `smoke:dry-run` and `smoke:examples`.
* CLI package scripts expose `smoke:generated`, `smoke:dry-run`, `smoke:lint-strategy`, and `smoke:examples`.
* Shared helper: `apps/cli/tests/support/generated-smoke-gate.ts`.
* Generated examples matrix: `apps/cli/tests/generated-projects.smoke.ts`.
* Removed old persistent linked examples script: `apps/cli/tests/linked-examples.smoke.ts`.
* Dry-run smoke: `apps/cli/tests/dry-run-cli.smoke.ts`.

## Completion Notes

* `smoke:generated` and `smoke:examples` now run the same generated scaffold matrix.
* `apps/cli/tests/generated-projects.smoke.ts` writes into `apps/examples/.generated/` and keeps successful output.
* `.generated/` now writes its own `pnpm-workspace.yaml` and `.npmrc` before smoke generation so `pnpm install` resolves generated project dependencies inside the smoke workspace instead of falling through to the repository root workspace.
* `CREATE_YUME_SMOKE_CASES` supports targeted selectors such as `react`, `vue`, `frontend`, `node`, `backend`, `cli`, `library`, `workspace`, preset names, and project names.
* The old linked-only smoke script was removed from the active command set.
* Full generated smoke was intentionally not run during this change because no generated template content changed; use targeted smoke when changing a specific scaffold surface.
