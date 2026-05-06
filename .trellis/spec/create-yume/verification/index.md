# Verification

> Validation selection for CLI runtime, templates, generated projects, and knowledge changes.

---

## Minimum Verification Matrix

| Change type | Minimum command |
| --- | --- |
| Template fragment, partial, registry, helper | `pnpm --filter create-yume test` |
| Planner behavior or `PlanSpec` projection | `pnpm --filter create-yume test` |
| JSON/text mutation or package manifest policy | `pnpm --filter create-yume build` plus focused tests |
| Workspace root materialization | `pnpm --filter create-yume test -- workspace-root` |
| Workspace package generation | `pnpm --filter create-yume test -- planner && pnpm --filter create-yume typecheck` |
| CLI args, `--spec`, resolved spec export | `pnpm --filter create-yume test -- cli-args create-spec compose preview && pnpm --filter create-yume typecheck`; add `pnpm --filter create-yume smoke:dry-run` when the change touches dry-run no-write behavior or root/package preview grouping |
| CLI toolkit track, generated CLI dependencies, or bin behavior | `pnpm --filter create-yume test -- cli-args create-spec planner package-json template-render generated-smoke-gate && CREATE_YUME_SMOKE_CASES=cli pnpm --filter create-yume smoke:examples` |
| Real generated project baseline | `pnpm --filter create-yume smoke:examples` |
| Docs/spec/user-only changes | Manual cold read plus targeted tests that assert documentation contracts |
| Unknown or broad impact | `pnpm verify` |

Root `pnpm verify` and `pnpm verify:code` must include `pnpm knip` so broad maintenance checks catch unused files, exports, and dependencies by default. Keep `pnpm knip` as the focused command when only dead-code analysis is needed.

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
- Use `CREATE_YUME_SMOKE_CASES` to run only affected generated surfaces when unrelated templates or generation paths were not changed. Supported selectors include preset names, project names, and broad tags such as `react`, `vue`, `frontend`, `node`, `backend`, `cli`, `library`, and `workspace`.
- Generated smoke uses `CREATE_YUME_SMOKE_CONCURRENCY` for bounded parallel generation and post-install build/lint/bin checks; default is `2`. Keep per-project `pnpm install` serial under `apps/examples/.generated/` to avoid shared pnpm workspace lockfile races.

## Related Contracts

- [Generated Scaffold Audit](./generated-scaffold-audit.md)
- [Phase Roadmap Contracts](./phase-roadmap.md)

## Forbidden Patterns

- Do not treat "tests ran" as sufficient if the command does not cover the changed surface.
- Do not hand-edit generated output under `apps/examples/.generated/`; fix templates or runtime owners.
- Do not let full-preset lint warnings accumulate.
