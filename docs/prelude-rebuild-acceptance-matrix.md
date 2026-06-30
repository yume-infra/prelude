---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 定义 prelude 重建验收门禁和每个门禁的验证 seam。
status: active
sources:
  - docs/create-maintain-architecture.md
  - docs/prelude-final-state.md
updated: 2026-06-29
---

# Prelude Rebuild Acceptance Matrix

## Scope

This module is a validation contract.

This module is not target architecture and not a transitional plan.

Target architecture remains [`prelude-final-state.md`](./prelude-final-state.md).

## Evidence

Use these sources in this order when judging acceptance:

1. Active docs under `docs/`.
2. Current Effect harness pin and official Effect v4 documentation mirrored by the harness.
3. Current maintain-domain contract rules.
4. Historical `main` create-yume implementation as ability baseline only.

Historical `main` MAY prove that an ability existed.

Historical `main` MUST NOT reintroduce presets, `ProjectConfig`, Plan/PlanSpec creation truth, Handlebars rendering, global template inheritance, or ordinary scaffold lifecycle update.

## Gates

| Priority | Gate | Acceptance signal | Verification seam |
| --- | --- | --- | --- |
| 1 | Create mainline | Guided CLI, direct spec, and CreateSpec recipes enter the same `CreateSpec -> resolved create graph -> capability modules -> create surfaces -> create WritePlan -> files -> create verification -> handoff` path. | Route tests, resolver tests, materializer tests, and generated smoke inspect emitted specs, plans, files, and verified targets. |
| 2 | Maintain mainline | Maintain owns manifest provider references, provider records, managed claims, status, verify, update, drift check, maintain WritePlan, provider record base refresh, and manifest reference refresh. Ordinary scaffold is not maintain state. | Maintain tests cover manifest absence, provider record selection, status, verify, update, drift, and base refresh. |
| 3 | Create-maintain association | Create initializes maintain only when selected. The association transfers managed intent, not ordinary scaffold ownership or full create resolved graph update authority. | Integration tests inspect initial managed claims and verify ordinary generated files are not maintain claims. |
| 4 | Capability modules | User-understandable abilities are represented as scoped capability modules with requirements, conflicts, create surfaces, contributions, and create verification expectations. Adding an ability does not require editing unrelated materializers or route branches. | Capability registry and resolver tests assert selection, defaults, conflicts, and package/root scoping. |
| 5 | Create surfaces | Each shared semantic resource has one create surface and one materializer. Capabilities contribute typed data to surfaces instead of writing shared files directly. Conflicts are rejected before writes. | Surface/materializer tests cover merge, dedupe, conflict, path ownership, and operation emission. |
| 6 | Template boundary | Complete local templates or source emitters live under owning deep modules. Template reuse uses complete file copy, small explicit variables, or local helpers only. Global renderer, cross-capability textual includes, and hidden capability-list conditionals are absent. | Source-emission tests assert generated app, package, config, and maintain initialization artifacts through public create seams. |
| 7 | Effect v4 native implementation | Effect-returning functions use official v4 patterns such as `Effect.fn`; services use `Context.Service`; domain errors use schema-backed tagged errors where they cross boundaries; CLI parsing/routing uses Effect CLI modules; tests use `@effect/vitest` and `it.effect` for Effect programs. | Typecheck with the harness baseline, targeted unit tests, route tests, and Effect official-pattern checks where useful. |
| 8 | Generated ability parity | The new model restores useful create-yume ability intent through the new architecture: React, Vue, Node backend, library, CLI, Effect package, workspace roots, workspace starters, routing, state, CSS, linting, Knip, create-time dependency policy, dry-run, print-spec, and inspectable generated examples. | Generated smoke installs, builds, typechecks, lints, runs, and inspects representative targets. |
| 9 | Maintain drift boundary | Maintain update compares desired/base/current logical values and blocks on drift, undeclared surfaces, incompatible contract transitions, and namespace violations. | Maintain reconciliation tests cover already-applied, safe-update, drift, undeclared-surface, and contract-mismatch cases. |
| 10 | Generated smoke gate | Generated smoke output remains inspectable under the repo-local generated examples area. Smoke includes at least one renderable app target and at least one maintain-domain target. | Generated smoke scripts and smoke-gate tests define required intent areas and external checks. |

## Ability Baseline

The historical create-yume implementation proves these abilities should be recovered in the new model unless active docs explicitly reject them:

- Guided creation for unclear direction.
- Direct spec creation for repeatable generation.
- React and Vue applications with minimal and full variants expressed through CreateSpec recipes.
- Node backend, library, CLI, and Effect package targets.
- Workspace roots and composed workspace layouts, including CLI/library and fullstack web/API/shared shapes.
- CSS, router, and state choices modeled as scoped capabilities when they own dependencies, source slots, verification, or conflicts.
- Linting, Knip, create-time dependency policy, package manager baseline, and generated examples as first-class create acceptance surfaces.
- Dry-run and print-spec behavior that proves create planning without writing ordinary scaffold output.

## Ordering

Remaining rebuild work SHOULD be tracked in this order:

1. Deepen capability modules so historical ability semantics can be imported without scattering CLI/schema/verification knowledge.
2. Deepen create surfaces and materializer dispatch so new semantics do not expand central switches.
3. Move create verification expectations closer to capability modules and surfaces.
4. Establish CreateSpec recipes and semantic import classification for historical template intent.
5. Recover useful generated-project ability surface from create-yume through the new model.
6. Expand generated smoke and maintain contract gates so regressions are caught at generated project and managed lifecycle boundaries.

Each PRD SHOULD point back to this matrix and prove which gates it advances.
