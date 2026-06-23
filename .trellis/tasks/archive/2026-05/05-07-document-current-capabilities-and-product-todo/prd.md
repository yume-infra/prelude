# document current capabilities and product todo

## Goal

Create a human-facing product alignment document that lists create-yume's current shipped capabilities and leaves a clear TODO section for future product vision items, so new work can be compared against the existing product boundary before implementation.

## What I Already Know

- The user wants a list of existing capabilities first, then plans to add new TODO items into the document.
- Stable human-facing project knowledge belongs in `.trellis/user/`, not `docs/`.
- Current supported scaffold scope includes React, Vue, Node/backend, CLI tools, library packages, pnpm workspace roots, and structured workspace package generation.
- Current unsupported scope includes append/update of existing projects, worker apps, remote templates, plugin template sources, and full interactive arbitrary workspace package graph configuration.

## Assumptions

- The document should be concise enough to use as a product steering artifact, not a full duplicate of every spec.
- The document should link from `.trellis/user/index.md` so future sessions can find it.
- The TODO section should be intentionally editable by the user and should not be treated as executable implementation contract until converted into Trellis tasks/specs.

## Requirements

- Add a `.trellis/user/` document in Simplified Chinese.
- Include current capabilities grouped by product area.
- Include current unsupported/deferred capabilities so TODOs can be compared against known gaps.
- Include a TODO area that the user can extend.
- Update the user docs index reading order.
- Do not change runtime code or generated scaffold behavior.

## Acceptance Criteria

- [x] A product alignment document exists under `.trellis/user/`.
- [x] The document lists shipped capabilities without overstating unsupported features.
- [x] The document has an explicit TODO section for user-added future work.
- [x] `.trellis/user/index.md` links to the new document.
- [x] Knowledge sync judgment is recorded.

## Definition of Done

- Manual cold read confirms the document is coherent and scoped.
- `git diff --check` passes.
- No code, templates, generated output, or package metadata are changed.

## Out of Scope

- Implementing any new product TODO.
- Creating a release roadmap with dates.
- Changing `.trellis/spec/` contracts unless the documentation reveals a missing executable rule.

## Technical Notes

- Relevant user docs: `.trellis/user/index.md`, `.trellis/user/create-yume.md`, `.trellis/user/generated-scaffolds.md`.
- Relevant spec: `.trellis/spec/create-yume/repository/index.md`.
- Skill used: `trellis-brainstorm` for task/PRD setup and `yume-docs-spec-sync` for knowledge placement judgment.

## Implementation Summary

- Added `.trellis/user/product-capabilities-and-todo.md`.
- Updated `.trellis/user/index.md` reading order to include the product alignment document.
- Fixed this task's `implement.jsonl` and `check.jsonl` to use the existing Trellis `file` schema.

## Verification

- Manual cold read: pass.
- `python3 ./.trellis/scripts/task.py validate 05-07-document-current-capabilities-and-product-todo`: pass.
- `git diff --check`: pass.
- `pnpm --filter create-yume test -- phase-documentation-alignment`: pass, 33 test files / 300 tests.

## Knowledge Sync Judgment

- `.trellis/spec/` update: no
  - Target: n/a
  - Reason: this task documents existing product capabilities and TODO capture process; it does not create or change executable generation, CLI, template, package, dependency, or verification contracts.
- `.trellis/user/` update: yes
  - Target: `.trellis/user/product-capabilities-and-todo.md`, `.trellis/user/index.md`
  - Reason: humans need a stable product alignment page to compare new TODO ideas against shipped and deferred capabilities.
- Existing contract followed: stable human-facing project knowledge belongs in `.trellis/user/`; executable implementation rules remain in `.trellis/spec/`.
- Verification: manual cold read, task context validation, `git diff --check`, and focused documentation-alignment test.
- Residual risk: the TODO section is intentionally empty aside from placeholders until the user adds product priorities.
