# Examples Generated Smoke

> Rules for `apps/examples` and generated-output validation.

---

## Scope

`apps/examples` is not maintained application source. It is the persistent smoke target for generated `@sayoriqwq/prelude` output under `apps/examples/.generated/`.

## Contracts

- Fix generated output defects in `apps/cli/templates/` or CLI runtime, not in `.generated/`.
- Generated smoke output must be produced by the built local CLI and kept inspectable after success.
- The `.generated/` root must define its own pnpm workspace boundary so package installs resolve generated project dependencies instead of falling through to the repository root workspace.
- Standalone preset installs must pass `--ignore-workspace` so they do not share the `.generated` workspace lockfile; generated workspace roots must install as workspaces so internal `workspace:*` links are exercised.
- Generated smoke installs may pass `--trust-policy-ignore-after=10080` to keep old transitive provenance gaps from blocking scaffold validation while still preserving recent trust-downgrade signal.
- Slow smoke should be selected with `PRELUDE_SMOKE_CASES` when a change only affects a subset of templates or generation paths.
- Generated smoke should default to bounded safe concurrency with `PRELUDE_SMOKE_CONCURRENCY=2`: project generation and post-install build/lint/bin checks may run concurrently, but per-project `pnpm install` must stay serial inside `.generated/` to avoid shared workspace lockfile races.
- Generated output is disposable and should not become the source of hand-written examples.

## Commands

```bash
pnpm smoke:examples
pnpm --filter @sayoriqwq/prelude smoke:examples
```

## Tests Required

- When changing CLI bin behavior, run `PRELUDE_SMOKE_CASES=cli pnpm --filter @sayoriqwq/prelude smoke:examples`.
- When changing generated React/Vue full presets, ensure lint-enabled generated output remains clean.
- When changing Node/CLI scaffold behavior, verify generated TypeScript ESM build and executable entry behavior.

## Forbidden Patterns

- Do not edit `apps/examples/.generated/` as the durable fix.
- Do not add generated application source to `apps/examples`.
- Do not treat generated output as stable repository source.
