# Examples Generated Smoke

> Rules for `apps/examples` and linked generated-output validation.

---

## Scope

`apps/examples` is not maintained application source. It is a smoke target for linked `create-yume` executions, with generated output under `apps/examples/.generated/`.

## Contracts

- Fix generated output defects in `apps/cli/templates/` or CLI runtime, not in `.generated/`.
- Linked smoke must exercise the local `create-yume` bin.
- Generated output is disposable and should not become the source of hand-written examples.

## Commands

```bash
pnpm smoke:examples
pnpm --filter create-yume smoke:examples
```

## Tests Required

- When changing CLI bin/link behavior, run linked examples smoke.
- When changing generated React/Vue full presets, ensure lint-enabled generated output remains clean.
- When changing Node/CLI scaffold behavior, verify generated TypeScript ESM build and executable entry behavior.

## Forbidden Patterns

- Do not edit `apps/examples/.generated/` as the durable fix.
- Do not add generated application source to `apps/examples`.
- Do not treat generated output as stable repository source.
