# Effect Branching

> Exhaustive control flow for schema-constrained cases.

---

## Contracts

- Closed unions from schemas must be handled exhaustively.
- Use `Match.exhaustive` when it improves clarity for structured `_tag` or literal-union cases.
- A `switch` with a compile-time `never` check is acceptable when it is simpler and still exhaustive.
- Do not rely on runtime fallback branches for supported project types, presets, package kinds, target scopes, or contribution unit kinds.
- Keep simple local branches as `if` / `switch`; introduce `Match` only when it makes the branch safer or clearer.

## Use When

- Adding a new `ProjectType`, preset, `GenerationPackageKind`, `GenerationTargetScope`, or ownership layer.
- Editing planners, template registry filtering, package manifest contributions, or create spec adaptation.

## Refactor Signals

- A default branch silently accepts an unknown supported mode.
- A new union member compiles without forcing all planning and rendering sites to update.
- Schema decode accepts a case that downstream code treats as impossible.

