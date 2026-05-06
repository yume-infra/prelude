# Examples Generated Smoke

> Rules for `apps/examples` and generated-output validation.

---

## Scope

`apps/examples` is not maintained application source. It is the persistent smoke target for generated `create-yume` output under `apps/examples/.generated/`.

## Contracts

- Fix generated output defects in `apps/cli/templates/` or CLI runtime, not in `.generated/`.
- Generated smoke output must be produced by the built local CLI and kept inspectable after success.
- Slow smoke should be selected with `CREATE_YUME_SMOKE_CASES` when a change only affects a subset of templates or generation paths.
- Generated output is disposable and should not become the source of hand-written examples.

## Commands

```bash
pnpm smoke:examples
pnpm --filter create-yume smoke:examples
```

## Tests Required

- When changing CLI bin behavior, run `CREATE_YUME_SMOKE_CASES=cli pnpm --filter create-yume smoke:examples`.
- When changing generated React/Vue full presets, ensure lint-enabled generated output remains clean.
- When changing Node/CLI scaffold behavior, verify generated TypeScript ESM build and executable entry behavior.

## Forbidden Patterns

- Do not edit `apps/examples/.generated/` as the durable fix.
- Do not add generated application source to `apps/examples`.
- Do not treat generated output as stable repository source.
