# Merge A/B/C Expansion Worktrees

## Goal

Integrate the three expansion worktree outputs into the main repository in the previously agreed order:

1. A: Turborepo workspace foundation
2. B: Effect CLI scaffold track
3. C: Turborepo monorepo taste expansion

## Requirements

- Preserve existing main-branch Trellis/doc/spec migration changes; do not revert unrelated dirty work.
- Apply A before B, then fold C as planning/spec input.
- Resolve code, test, template, documentation, and spec conflicts intentionally.
- Keep current product boundaries: no Turbopack, no Next-specific work, no remote templates/plugins, no incremental update flow.
- Re-run focused and full validation after integration.

## Acceptance Criteria

- A changes are present in main: root workspace scripts derive from emitted child package scripts, generated turbo baseline is tightened, and neutral library tsconfig omits Node types.
- B changes are present in main: explicit `toolkit: "effect"` CLI path, Effect CLI preset/alias, templates, runtime deps, docs, tests, and generated smoke coverage.
- B dependency versions remain peer-compatible and generated `cli-effect` install has no Effect peer warning.
- C recommendations/spec updates are preserved in the appropriate current Trellis spec/user-doc shape.
- Tests/typecheck/lint/diff checks pass or blockers are documented precisely.
