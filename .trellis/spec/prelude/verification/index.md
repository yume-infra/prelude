# Verification

> Validation selection for CLI runtime, templates, generated projects, and knowledge changes.

---

## Minimum Verification Matrix

| Change type | Minimum command |
| --- | --- |
| Template fragment, partial, registry, helper | `pnpm --filter @sayoriqwq/prelude test` |
| Planner behavior or `PlanSpec` projection | `pnpm --filter @sayoriqwq/prelude test` |
| JSON/text mutation or package manifest policy | `pnpm --filter @sayoriqwq/prelude build` plus focused tests |
| Workspace root materialization | `pnpm --filter @sayoriqwq/prelude test -- workspace-root` |
| Workspace package generation | `pnpm --filter @sayoriqwq/prelude test -- planner && pnpm --filter @sayoriqwq/prelude typecheck` |
| CLI args, `--spec`, resolved spec export | `pnpm --filter @sayoriqwq/prelude test -- cli-args create-spec compose preview && pnpm --filter @sayoriqwq/prelude typecheck`; add `pnpm --filter @sayoriqwq/prelude smoke:dry-run` when the change touches dry-run no-write behavior or root/package preview grouping |
| CLI toolkit track, generated CLI dependencies, or bin behavior | `pnpm --filter @sayoriqwq/prelude test -- cli-args create-spec planner package-json template-render generated-smoke-gate && PRELUDE_SMOKE_CASES=cli pnpm --filter @sayoriqwq/prelude smoke:examples` |
| Real generated project baseline | `pnpm --filter @sayoriqwq/prelude smoke:examples` |
| Docs/spec/user-only changes | Manual cold read plus targeted tests that assert documentation contracts |
| Unknown or broad impact | `pnpm verify` |

Root `pnpm verify` and `pnpm verify:code` must include `pnpm knip` so broad maintenance checks catch unused files, exports, and dependencies by default. Keep `pnpm knip` as the focused command when only dead-code analysis is needed.

Dependency freshness checks are intentionally separate from verification. Use `pnpm deps:check` or generated `deps:check` scripts to inspect stale dependencies; do not fail build/test/lint verification just because the registry has a newer release.

Release readiness and publish-path validation must run the workflow-equivalent full generated smoke command, `pnpm smoke:examples`, when release metadata, version commits, generated `verify` gates, package manifest policy, Knip policy, dependency ownership, or broad generated-output behavior changed. Targeted `PRELUDE_SMOKE_CASES=<selector>` runs are useful for debugging and focused fixes, but they are not sufficient release-ready evidence for those surfaces.

## Test Organization

- CLI tests live under `apps/cli/tests/`.
- Runtime source under `apps/cli/src/` must not contain `*.test.ts` or `*.spec.ts`.
- Test support belongs under `apps/cli/tests/support/`.
- Snapshot tests keep Vitest default `__snapshots__/` placement.
- Real generated smoke output is generated under `apps/examples/.generated/` and is kept after successful smoke runs for inspection.

## Generated Smoke Policy

- Full presets must build and pass `pnpm lint --max-warnings=0`.
- Minimal presets remain build-only unless a later spec changes that policy.
- Node and CLI scaffold smoke must verify TypeScript ESM build output.
- CLI tool smoke must verify `bin` metadata, shebang behavior, and executable invocation.
- Effect CLI smoke must install peer-compatible Effect packages, build the generated project, and invoke the generated bin.
- Workspace generated smoke must cover real install/build for mixed `apps/*` and `libs/*` packages, explicit `workspace:*` links, root workspace files, and package-local CLI bin invocation.
- Use `PRELUDE_SMOKE_CASES` to run only affected generated surfaces when unrelated templates or generation paths were not changed. Supported selectors include preset names, project names, and broad tags such as `react`, `vue`, `frontend`, `node`, `backend`, `cli`, `library`, and `workspace`.
- Generated smoke uses `PRELUDE_SMOKE_CONCURRENCY` for bounded parallel generation and post-install build/lint/bin checks; default is `2`. Keep per-project `pnpm install` serial under `apps/examples/.generated/` to avoid shared pnpm workspace lockfile races.

## Related Contracts

- [Generated Scaffold Audit](./generated-scaffold-audit.md)
- [Phase Roadmap Contracts](./phase-roadmap.md)

## Forbidden Patterns

- Do not treat "tests ran" as sufficient if the command does not cover the changed surface.
- Do not hand-edit generated output under `apps/examples/.generated/`; fix templates or runtime owners.
- Do not let full-preset lint warnings accumulate.
