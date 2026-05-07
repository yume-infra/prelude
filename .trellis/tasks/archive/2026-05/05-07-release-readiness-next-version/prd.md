# release readiness for next version

## Goal

Review whether the current `dev` branch is ready for the next create-yume release by comparing it against `main`, validating the changed surfaces, and producing a blocker-first release readiness checklist with command-backed evidence.

## What I Already Know

- The user asked to prepare a new version and explicitly invoked `yume-release-readiness`.
- The repository is a Trellis-managed create-yume monorepo.
- The release readiness workflow must compare `dev` against `main`, inspect implementation/tests/generated smoke/docs/spec/user knowledge/dependencies/release-note risk, and include a knowledge sync judgment.

## Requirements

- Establish the release baseline with `main...dev`.
- Fetch/prune remotes before final baseline judgment.
- Read required create-yume specs and relevant layer indexes based on changed files.
- Run verification commands that match the changed surfaces.
- Include generated-output and warning judgment.
- Include dependency and release notes judgment.
- Include `.trellis/spec/` and `.trellis/user/` knowledge sync judgment.

## Acceptance Criteria

- [x] Release readiness checklist is recorded with blockers first.
- [x] Verification evidence includes exact commands and results.
- [x] Generated-output warnings and smoke coverage are classified.
- [x] Dependency/release-notes risk is classified.
- [x] Knowledge Sync Judgment is recorded.
- [x] Task is ready to archive after the release metadata commit.

## Definition of Done

- Working tree is clean except for committed task/journal/archive updates.
- Required verification commands either pass or blockers are recorded.
- Any required follow-up is explicit and actionable.

## Out of Scope

- Publishing the package.
- Bumping version numbers or editing release notes unless the readiness check identifies that as a required follow-up and the user asks to implement it.
- Fixing generated-output defects without a concrete symptom; route those to `yume-template-source-map-fixer`.

## Technical Notes

- Primary skill: `.agents/skills/yume-release-readiness/SKILL.md`
- Knowledge sync skill: `.agents/skills/yume-docs-spec-sync/SKILL.md`

## Release Readiness: Ready with risks after release metadata follow-up

### Blockers

- None after release metadata follow-up on 2026-05-07.

### Cleared Blockers

- [P0] No new publishable npm version is prepared. Cleared.
  - Fix applied: created a patch Changeset for `@sayoriqwq/create-yume` covering the maintainer-facing AI workflow infrastructure, then ran `pnpm changeset version`.
  - Evidence: `apps/cli/package.json` now prepares `0.2.1`; `apps/cli/CHANGELOG.md` now contains a `0.2.1` patch entry for release readiness, docs/spec sync, template source-map fixer, preset expansion planning, skill improver, skill audit, and dogfood release-validation improvements.
  - Status command note: `pnpm changeset status --since main` now exits 1 with `Some packages have been changed but no changesets were found` because the changeset has already been consumed by `changeset version` and the version/changelog files are materialized in the working tree.

### Residual Risks

- [P2] Release branch contains project-local AI infrastructure and Trellis archive/journal changes, not runtime package code.
  - Evidence: `git diff --name-status main...HEAD` changed `.agents/skills/yume-*`, release metadata, `.trellis/tasks/archive/**`, and `.trellis/workspace/sayoriqwq/**`; no `apps/cli/src/**` or `apps/cli/templates/**` runtime/template paths changed in the release slice.
  - Acceptance rationale: acceptable if the intended release is a repository workflow/infrastructure update, now paired with a `0.2.1` patch version and maintainer-facing changelog entry.
  - Follow-up: mention AI workflow infrastructure only in maintainer-facing release notes if publishing or merging this branch.

- [P2] Generated smoke had transient npm registry retry warnings during install.
  - Evidence: `pnpm smoke:examples` logged `ECONNRESET` retries for registry requests, but the command exited successfully and completed all generated checks.
  - Acceptance rationale: network retry warnings did not become build/lint/install failures.
  - Follow-up: rerun smoke if publishing from a stricter CI/release environment requires a warning-free install log.

### Verification Evidence

| Surface | Required command | Result | Evidence |
| --- | --- | --- | --- |
| Release baseline | `git fetch origin --prune`; `git rev-parse main origin/main HEAD`; `git merge-base main HEAD` | pass | `main` and `origin/main` are both `9dbb2ddb08653a1d57ab40116df4d3fbd34532e2`; `HEAD` before this task is `a2d1c7ed8f7c8f33422c15803cb9e9dfcf34d18d`; merge base is `9dbb2ddb08653a1d57ab40116df4d3fbd34532e2`. |
| Project-local skills | `quick_validate.py` for all five `yume-*` skills plus `generated-scaffold-audit` and `update-template-deps` | pass | All seven skill validations reported `Skill is valid!`. |
| Diff hygiene | `git diff --check` | pass | No whitespace or patch hygiene issues. |
| Dependency freshness | `pnpm deps:check` | pass | `dependencies are already up-to-date`. |
| Changesets status before metadata follow-up | `pnpm changeset status --since main` | fail for publishing new version | Command succeeded but reported no packages to bump at patch/minor/major. |
| Changesets versioning | `pnpm changeset version` | pass | Consumed the patch changeset and updated `apps/cli/package.json` plus `apps/cli/CHANGELOG.md`. |
| Changesets status after versioning | `pnpm changeset status --since main` | expected post-versioning failure | Exits 1 with `Some packages have been changed but no changesets were found` because there is no pending changeset after the version/changelog have already been materialized. |
| Local install metadata refresh | `pnpm install` | pass | Refreshed pnpm workspace install state after the package version changed; `pnpm-lock.yaml` has no diff. |
| Release metadata diff hygiene | `git diff --check` | pass | No whitespace or patch hygiene issues after version/changelog updates. |
| Release metadata inspection | `git diff -- apps/cli/package.json apps/cli/CHANGELOG.md`; manual read | pass | Only the package version changed from `0.2.0` to `0.2.1` and the changelog gained the `0.2.1` patch section. |
| Code verification | `pnpm verify` | pass | Build passed; Vitest passed 33 files / 300 tests; eslint and knip completed. |
| Dry-run smoke | `pnpm smoke:dry-run` | pass | React, Vue, workspace, Node, backend, library, and CLI dry-run previews produced no target directories. |
| Generated examples smoke | `pnpm smoke:examples` | pass | 14 generated cases completed install/build/lint/bin/workspace checks. |
| npm package state | `npm view @sayoriqwq/create-yume version dist-tags --json` | published baseline inspected | Published latest was `0.2.0`; local `apps/cli/package.json` now prepares `0.2.1` after metadata follow-up. |

### Comparison Summary

- Base: `main` / `origin/main` at `9dbb2ddb08653a1d57ab40116df4d3fbd34532e2`
- Head before this readiness task: `dev` at `a2d1c7ed8f7c8f33422c15803cb9e9dfcf34d18d`
- Merge base: `9dbb2ddb08653a1d57ab40116df4d3fbd34532e2`
- Commit range: `main..dev`
- Changed surfaces:
  - Project-local AI workflow skills under `.agents/skills/yume-*`
  - Release metadata under `apps/cli/package.json` and `apps/cli/CHANGELOG.md`
  - Trellis task archive records
  - Trellis workspace journal/index records
- Working tree after metadata follow-up: modified `apps/cli/package.json`, `apps/cli/CHANGELOG.md`, and this active task PRD.

### Generated Output And Warning Judgment

- Generated surfaces reviewed: full release smoke baseline across React, Vue, Node, backend, CLI, library, and workspace generated outputs.
- Smoke selectors used: no selector; ran full `pnpm smoke:dry-run` and full `pnpm smoke:examples`.
- Expected warnings:
  - Lightning CSS unknown at-rule warnings for Tailwind CSS output during successful React/Vue full builds.
  - tsdown plugin timing warnings during successful generated CLI/library builds.
  - transient npm registry `ECONNRESET` retry warnings during install.
- Unexpected warnings or failures: none that caused command failure.
- Generated-output policy followed: no generated output was hand-edited; full generated presets ran lint with `--max-warnings=0`; minimal presets remained build-only; CLI/workspace bin invocations passed.

### Dependency And Release Notes Judgment

- Dependency state: current dependency freshness check passes.
- Catalog or generated manifest impact: none in this release slice.
- Release notes required: yes if publishing or merging as a maintainer-facing release; mention project-local AI workflow infrastructure, not end-user scaffold behavior.
- Migration or breaking-change notes: none.
- Package publication state: `@sayoriqwq/create-yume` now has publishable local version `0.2.1` prepared by Changesets; final commit, merge to `main`, push, and publish/release trigger remain outside this implementation handoff.

## Knowledge Sync Judgment

- `.trellis/spec/` update: no
  - Target: n/a
  - Reason: this readiness pass follows existing repository, verification, generated smoke, and skill-validation contracts; it does not create a new durable product or repository rule.
- `.trellis/user/` update: no
  - Target: n/a
  - Reason: supported scaffold scope, project architecture, onboarding, and human operating commands did not change.
- Existing contract followed: release readiness compared `dev` to `main`, used the verification matrix, treated generated output as evidence, kept dependency freshness separate from verification, and did not use `docs/` as source of truth.
- Verification: `quick_validate.py`, `git diff --check`, `pnpm deps:check`, `pnpm verify`, `pnpm smoke:dry-run`, `pnpm smoke:examples`, `pnpm changeset status --since main`, `pnpm changeset version`, `pnpm install`, release metadata diff inspection, and `npm view`.
- Residual risk: `pnpm changeset status --since main` is no longer the right signal after `pnpm changeset version` because the pending changeset has been consumed; reviewers should inspect the materialized `0.2.1` package version and changelog before committing and merging.
