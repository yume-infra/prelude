# PROTOTYPE - Fullscreen Create Workbench Shell

GitHub issue: https://github.com/yume-infra/prelude/issues/47

## Question

Does the desired v1 create entrypoint feel right as a fullscreen terminal
workbench where humans edit and inspect a `CreateSpec` draft, while direct
CLI/spec mode remains the non-interactive agent path?

Follow-up question after Sayori review:

Does the prototype feel right when the default screen is user-facing and minimal,
with engineering details collapsed behind preview/details/export actions?

## Command

```bash
pnpm prototype:create-workbench
```

In this local environment, if global pnpm is ahead of the workspace pin, use:

```bash
npx --yes pnpm@10.33.4 --config.verify-deps-before-run=false prototype:create-workbench
```

## Scope

- Throwaway prototype.
- Static UI only.
- No resolver.
- No WritePlan execution.
- No file writes.
- No manifest logic.
- No maintain update logic.

## Variants

- `1` / left arrow: Guided setup.
- `2`: Recipe gallery.
- `3` / right arrow: Review and create.
- `q`: Quit.

## Verdict

Pending Sayori review.
