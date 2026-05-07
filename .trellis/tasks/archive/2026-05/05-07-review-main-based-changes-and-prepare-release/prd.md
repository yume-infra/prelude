# Review Main-Based Changes And Prepare Release

## Goal

Systematically review the current `dev` branch against `main` after the large post-0.1.0 implementation wave, judge whether the work delivers a meaningful slice of the monorepo/Node/CLI product vision, and produce a concrete release-readiness checklist.

## Context

The current branch is based on `main` at `60f2213` / tag `@sayoriqwq/create-yume@0.1.0`.

The visible change set includes:

- Node engine and generated dependency maintenance updates.
- Knip integration in repository and generated templates.
- Generated smoke persistence and selector/concurrency behavior.
- Workspace root/package generation, target-aware template composition, and package manifest ownership changes.
- User docs and Trellis spec updates for generated scaffold scope.

## Requirements

- Dispatch subagents to review distinct release-readiness lanes in parallel.
- Compare current implementation against the 05-04 monorepo and Node/CLI roadmap vision.
- Treat `main...HEAD` as the review surface.
- Identify bugs, behavioral regressions, missing tests, stale docs/specs, and release blockers.
- Run or collect appropriate quality-gate commands for a broad release check.
- Produce a final answer that prioritizes actionable findings, then summarizes achieved vision and remaining release work.

## Acceptance Criteria

- [ ] Subagent reviews cover implementation intent, quality gates, and release checklist.
- [ ] Findings are ordered by severity and reference exact files/lines when possible.
- [ ] The report states whether the current implementation delivers part of the prior vision.
- [ ] The report includes commands run and their results.
- [ ] The report includes a concrete release-preparation checklist.

## Validation

- `git diff --stat main...HEAD`
- `git diff --name-only main...HEAD`
- `pnpm verify`
- Targeted generated smoke commands if broad verification exposes a narrower failure.

## Out Of Scope

- New product features beyond fixing release blockers found during review.
- Publishing the package.
- Changing version numbers unless explicitly requested after the review.
