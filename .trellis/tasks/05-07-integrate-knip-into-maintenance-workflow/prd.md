# Integrate Knip Into Maintenance Workflow

## Goal

Make Knip part of the normal maintenance verification path so dead files, unused exports, and unused dependencies are checked by default before release or broad code validation.

## Requirements

* `pnpm verify` runs Knip as part of the root verification workflow.
* `pnpm verify:code` stays aligned with `pnpm verify`.
* `pnpm knip` remains available for focused checks.
* Human-facing maintenance docs mention Knip in the normal verification path.
* Agent-facing verification guidance treats Knip as part of broad/default verification.

## Acceptance Criteria

* [x] Root scripts include Knip in the default verification path.
* [x] `pnpm verify` passes.
* [x] `.trellis/spec/create-yume/verification/index.md` reflects the Knip check.
* [x] `.trellis/user/contributing.md` reflects the normal maintenance command.

## Definition of Done

* Verification passes.
* Documentation/spec sync reviewed.
* Changes committed.

## Technical Approach

Append `pnpm knip` after build/test/lint in root `verify` and `verify:code`, preserving the standalone `knip` script for local focused use. Update verification docs rather than introducing another maintenance command.

## Out of Scope

* Adding CI workflow files.
* Reordering build/test/lint behavior beyond adding Knip.
* Adding pre-commit Knip checks.

## Technical Notes

* Relevant specs: `.trellis/spec/create-yume/repository/index.md`, `.trellis/spec/create-yume/verification/index.md`, `.trellis/spec/guides/code-reuse-thinking-guide.md`.
* Existing root release command already delegates to `pnpm verify`, so adding Knip there also covers release confidence.
* Final verification: `pnpm verify` passed, including build, 33 test files / 296 tests, lint, and Knip.
* Spec/user docs sync: updated verification spec and contributing guide because this changes the default maintenance workflow.
