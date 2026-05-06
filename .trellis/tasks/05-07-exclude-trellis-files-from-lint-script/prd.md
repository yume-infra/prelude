# Exclude Trellis Files From Lint Script

## Goal

Keep normal lint checks focused on repository source/config files and avoid linting Trellis task, journal, and spec metadata under `.trellis/`.

## Requirements

* `pnpm lint` does not lint files under `.trellis/`.
* `pnpm lint:fix` and lint-staged inherit the same ignore behavior through ESLint config.
* Normal project lint still passes.

## Acceptance Criteria

* [x] ESLint config ignores `.trellis/**`.
* [x] `pnpm lint` passes.
* [x] Focused check confirms a `.trellis` file is ignored by ESLint.

## Definition of Done

* Verification passes.
* Task archived and session recorded.

## Technical Approach

Add `.trellis/**` to the root Antfu ESLint `ignores` list instead of adding script-only CLI flags. This keeps all ESLint entry points consistent.

## Out of Scope

* Changing Knip coverage.
* Changing lint rules for source files.
* Changing Trellis file formatting.

## Technical Notes

* Relevant specs: `.trellis/spec/create-yume/repository/index.md`, `.trellis/spec/create-yume/verification/index.md`.
* Final verification:
  * `pnpm lint` passed.
  * `pnpm exec eslint .trellis/tasks/05-07-exclude-trellis-files-from-lint-script/task.json` returned 0 with the expected ignored-file warning.
  * `pnpm verify` passed, including build, 33 test files / 296 tests, lint, and Knip.
* Spec/user docs sync judgment: no `.trellis/spec/` or `.trellis/user/` updates needed. This is an ESLint ignore refinement for Trellis metadata, not a project architecture or validation contract change.
