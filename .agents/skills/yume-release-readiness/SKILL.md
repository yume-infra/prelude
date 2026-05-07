---
name: yume-release-readiness
description: "Review create-yume release readiness by comparing the current dev branch against main, checking implementation, tests, generated smoke, docs/spec/user knowledge, dependency state, and release-note risk, then producing a blocker-first release checklist with verification evidence."
---

# Yume Release Readiness

Use this skill when asked to decide whether the current create-yume `dev` branch is ready to release or merge toward release from `main`. The output is a blocker-first release checklist, not a general summary.

## Trigger Conditions

Use this skill for:

- Release readiness reviews, pre-release checks, release-candidate reviews, or "can we ship dev?" questions.
- Comparing current `dev` against `main` or another explicit release base.
- Reviewing whether implementation, tests, generated scaffold behavior, docs/spec/user knowledge, dependencies, and release notes are aligned.
- Turning recent project work into an actionable release-blocker checklist with command-backed evidence.

Do not use this skill for fixing generated scaffold defects. Use `yume-template-source-map-fixer` when the next action is a source fix for a generated-output symptom. Do not use it for dependency freshness updates only; use `update-template-deps` when the task is to refresh emitted dependency ranges.

## Required Reading

1. Read `.trellis/spec/create-yume/index.md`.
2. Read `.trellis/spec/create-yume/repository/index.md`.
3. Read `.trellis/spec/create-yume/verification/index.md`.
4. Read `.trellis/spec/create-yume/verification/generated-scaffold-audit.md` when generated-output quality, smoke results, lint warnings, editor diagnostics, or audit handoffs are part of the release surface.
5. Read the layer indexes matching changed files from `main...dev`: `cli-runtime`, `generation-model`, `template-system`, `workspace-packages`, `effect`, or repository docs.
6. Read `.trellis/user/generated-scaffolds.md` and `.trellis/user/create-yume.md` when supported scaffold scope, human-facing commands, or project architecture changed.
7. Read `yume-docs-spec-sync` before making the final knowledge-sync judgment.

## Comparison Baseline

Prefer `main...dev` for release comparison because it shows changes since the merge base.

Minimum comparison commands:

```bash
git status --short
git branch --show-current
git merge-base main HEAD
git log --oneline --decorate main..HEAD
git diff --stat main...HEAD
git diff --name-status main...HEAD
```

If the release base is not `main`, replace `main` with the explicit base and name that choice in the output. If local `main` may be stale, say so and either fetch with user approval where required by the environment or mark the baseline as a residual risk.

## Review Workflow

1. Establish the release slice.
   - Name the base branch, current branch, merge base, commit range, and whether the working tree is clean.
   - List changed surfaces: runtime, generation model, template system, workspace packages, verification, repository knowledge, dependencies, release metadata, and task-only files.
   - Separate committed branch changes from uncommitted local edits.

2. Triage blockers before summaries.
   - Treat missing or failing release-critical verification as a blocker until proven otherwise.
   - Treat broken generated install/build/lint/bin behavior as a blocker for affected supported presets.
   - Treat drift between implementation and `.trellis/spec/` executable contracts as a blocker when future agents would be misled.
   - Treat drift between supported behavior and `.trellis/user/` human-facing context as a release risk; upgrade to blocker when users would receive wrong operational guidance.
   - Treat missing source ownership for a generated-output issue as a blocker if the issue affects supported generated behavior.

3. Compare required surfaces.
   - **Implementation**: inspect changed source paths, changed schemas, owner contributions, template files, planner behavior, CLI UX, and workspace package logic.
   - **Tests**: verify that focused tests exist for changed contracts and that test names map to the changed surface.
   - **Generated smoke**: check whether `CREATE_YUME_SMOKE_CASES=<selector> pnpm --filter create-yume smoke:examples` or broader smoke ran for changed generated behavior.
   - **Docs/spec/user knowledge**: verify `.trellis/spec/` and `.trellis/user/` decisions with `yume-docs-spec-sync`; do not point to `docs/` as a source of truth.
   - **Dependencies**: inspect catalog, lockfile, generated manifest policy, and any dependency freshness evidence. Dependency staleness is not a verification failure by itself; missing catalog ownership or incompatible generated dependency behavior can be a blocker.
   - **Release notes risk**: identify user-visible behavior, breaking changes, new commands, changed supported scope, dependency changes, warning classifications, and migration notes that release notes must mention.

4. Validate changed surfaces with the minimum matching commands.
   - Template fragment, partial, registry, helper: `pnpm --filter create-yume test`.
   - Planner or `PlanSpec`: `pnpm --filter create-yume test`.
   - JSON/text mutation or package manifest policy: `pnpm --filter create-yume build` plus focused tests.
   - Workspace root materialization: `pnpm --filter create-yume test -- workspace-root`.
   - Workspace package generation: `pnpm --filter create-yume test -- planner && pnpm --filter create-yume typecheck`.
   - CLI args, `--spec`, resolved spec export: `pnpm --filter create-yume test -- cli-args create-spec compose preview && pnpm --filter create-yume typecheck`; add `pnpm --filter create-yume smoke:dry-run` for dry-run no-write behavior or root/package preview grouping.
   - CLI toolkit track, generated CLI dependencies, or bin behavior: `pnpm --filter create-yume test -- cli-args create-spec planner package-json template-render generated-smoke-gate && CREATE_YUME_SMOKE_CASES=cli pnpm --filter create-yume smoke:examples`.
   - Real generated project baseline: `pnpm --filter create-yume smoke:examples`.
   - Docs/spec/user-only changes: manual cold read plus targeted tests that assert documentation contracts.
   - Unknown or broad impact: `pnpm verify`.

5. Reconcile expected warnings and generated-output policy.
   - Tailwind CSS or Lightning CSS unknown at-rule warnings during successful generated React/Vue full-preset Vite production builds are expected and non-blocking when the build exits successfully and generated lint passes.
   - Full generated presets must pass `pnpm lint --max-warnings=0` where lint is enabled.
   - Minimal generated presets remain build-only unless a spec changes that policy.
   - Node and CLI scaffold smoke must verify TypeScript ESM build output.
   - CLI tool smoke must verify `bin` metadata, shebang behavior, and executable invocation.
   - Workspace generated smoke must cover real install/build for mixed `apps/*` and `libs/*` packages, explicit `workspace:*` links, root workspace files, and package-local CLI bin invocation.
   - Never propose hand-editing `apps/examples/.generated/` or another ignored generated target as the release fix. Generated output is evidence; durable fixes belong in templates, owners, planner, schema, package policy, or verification gates.

6. Decide release readiness.
   - **Ready** only when no blockers remain, required verification has passing evidence, expected warnings are classified, release notes risk is accounted for, and knowledge sync is judged.
   - **Ready with risks** only when remaining items are explicit non-blocking risks with owners or follow-up timing.
   - **Not ready** when any blocker lacks a fix, required verification is missing or failing, release notes would misrepresent behavior, or source-of-truth docs/spec/user context is materially stale.

## Blocker Severity

- **P0 Blocker**: Cannot release. Broken supported generated output, failing required verification, corrupted package graph, CLI crash on supported input, missing release-base comparison, or known misleading source-of-truth contract.
- **P1 Blocker**: Should not release without owner decision. Missing targeted coverage for changed behavior, incomplete generated smoke for affected supported surface, dependency policy drift, release notes gap for user-visible behavior, or unresolved source-map ambiguity.
- **P2 Risk**: Can release with explicit acceptance. Expected build warning, stale dependency report with no compatibility impact, narrow unverified edge case outside changed surface, or non-source-of-truth task metadata gap.

## Release Checklist Output

Lead with findings. If there are no blockers, say so clearly before the checklist.

```markdown
## Release Readiness: <Ready | Ready with risks | Not ready>

### Blockers

- [P0/P1] <actionable blocker title>
  - Evidence:
  - Required fix:
  - Owner surface:
  - Verification to clear:

### Residual Risks

- [P2] <risk title>
  - Evidence:
  - Acceptance rationale:
  - Follow-up:

### Verification Evidence

| Surface | Required command | Result | Evidence |
| --- | --- | --- | --- |
| <surface> | `<command>` | pass/fail/not run | <short evidence> |

### Comparison Summary

- Base:
- Head:
- Merge base:
- Commit range:
- Changed surfaces:
- Working tree:

### Generated Output And Warning Judgment

- Generated surfaces reviewed:
- Smoke selectors used:
- Expected warnings:
- Unexpected warnings or failures:
- Generated-output policy followed:

### Dependency And Release Notes Judgment

- Dependency state:
- Catalog or generated manifest impact:
- Release notes required:
- Migration or breaking-change notes:

### Knowledge Sync Judgment

- `.trellis/spec/` update:
  - Target:
  - Reason:
- `.trellis/user/` update:
  - Target:
  - Reason:
- Existing contract followed:
- Verification:
- Residual risk:
```

## Success Criteria

The skill succeeds when the answer gives maintainers a direct release decision, lists actionable blockers before summaries, maps every required verification command to the changed surface, classifies expected generated build warnings correctly, refuses generated-output hand edits as release fixes, and includes a docs/spec/user knowledge-sync judgment.
