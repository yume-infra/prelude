# Prelude Rebuild Acceptance Matrix

This document defines the acceptance gates for the `prelude` rebuild.

It is a validation contract, not a target architecture document and not a
migration plan. The target architecture remains `prelude-final-state.md`; this
matrix says how agents and reviewers know the implementation is converging on
that target.

## Evidence Sources

Use these sources in this order when judging acceptance:

1. Active docs under `docs/`.
2. The current Effect harness pin and official Effect v4 documentation mirrored
   by the harness.
3. The effect-harness provider contract and runtime projection rules.
4. The old `main` create-yume implementation as an ability baseline only.

The old `main` implementation is not an architecture baseline. It may prove that
an ability existed, but it must not reintroduce presets, `ProjectConfig`, Plan /
PlanSpec creation truth, Handlebars rendering, global template inheritance, or
ordinary scaffold lifecycle update.

## Acceptance Gates

| Priority | Gate | Acceptance signal | Verification seam |
| --- | --- | --- | --- |
| 1 | Canonical creation path | Guided CLI and direct spec creation both enter the same `CreateSpec -> ResolvedGraph -> Capability Contributions -> Surface Materializers -> WritePlan -> Files + manifest` path. No prompt branch or reusable shape bypasses resolution. | Route-level tests and generated smoke runs inspect emitted specs, write plans, manifest records, and generated targets. |
| 2 | Provider boundary | `effect-harness` is integrated as a provider artifact / adapter. Provider semantics, package baseline, runtime files, guardrails, lifecycle surfaces, and verification rules are owned by the provider; `prelude` validates and applies provider-declared operations through its write boundary. | Provider create contract tests, provider lifecycle status/verify/update tests, and generated harness smoke targets. |
| 3 | Capability registry | User-understandable abilities are represented as scoped capabilities with declared requirements, conflicts, typed contributions, lifecycle claims, and verification requirements. Adding an ability does not require editing unrelated materializers or route branches. | Resolver and contribution tests assert capability selection, defaults, conflicts, provider dependencies, and package/root scoping. |
| 4 | Logical surfaces and materializers | Each physical file or managed block has one owner materializer. Capabilities contribute typed data to logical surfaces instead of writing shared files directly. Conflicts are rejected before writes. | Materializer tests cover merge, dedupe, conflict, ownership, lifecycle snapshot, and operation emission behavior. |
| 5 | Template and source emission boundary | Complete local templates or source emitters live under owning deep modules. Template reuse uses complete file copy, small explicit variables, or local helpers only. No global template engine, cross-capability textual includes, or capability-list conditionals are needed. | Source-emission tests assert generated app, package, config, and provider artifacts through public create/generation seams. |
| 6 | Effect v4 native implementation | Effect-returning functions use official v4 patterns such as `Effect.fn`; services use `Context.Service`; domain errors use schema-backed tagged errors where they cross boundaries; CLI parsing/routing uses Effect CLI modules; tests use `@effect/vitest` and `it.effect` for Effect programs. | Typecheck with the harness baseline, targeted unit tests, route tests, and Effect official-pattern grep checks where useful. |
| 7 | Generated project parity | The new model restores the useful ability surface from create-yume: React, Vue, Node backend, library, CLI, Effect package, workspace root, workspace CLI/library, workspace fullstack, routing, state, CSS, linting, Knip, dependency update intent, dry-run, print-spec, and inspectable generated examples. | Generated smoke matrix installs, builds, typechecks, lints, runs, and inspects representative targets. |
| 8 | Lifecycle update boundary | Post-create update is scoped to explicit managed contributions. Ordinary scaffold output is handed off. Update compares desired/base/current logical values and blocks on drift, undeclared external surfaces, incompatible contract transitions, or provider namespace violations. | Provider lifecycle tests and managed-surface reconciliation tests cover already-applied, safe-update, drift, undeclared-surface, and contract-mismatch cases. |
| 9 | Manifest ledger | The manifest records creation provenance, resolved graph debug context, prelude-owned pins, lifecycle provider records, managed claims/surfaces, generated-user surfaces, and verification records after successful apply and verification. It is not desired truth. | Manifest integration tests inspect successful create output and lifecycle update output. |
| 10 | Generated smoke gate | Generated smoke output remains inspectable under the repo-local generated examples area. Smoke includes at least one provider/harness target and one renderable app target, and it exercises install, build, typecheck, lint, run, verify, provider contract, and dry-run no-write behavior. | Generated smoke scripts and smoke-gate tests define the required intent areas and external checks. |

## Main Ability Baseline

The old create-yume implementation proves these abilities should be recovered in
the new model unless a current doc explicitly rejects them:

- Guided creation for unclear direction.
- Direct spec creation for repeatable generation.
- React and Vue applications with minimal and full variants expressed as
  complete reusable `CreateSpec` files, not presets.
- Node backend, library, CLI, and Effect package targets.
- Workspace roots and composed workspace layouts, including CLI/library and
  fullstack web/API/shared shapes.
- CSS, router, and state choices modeled as scoped capabilities when they own
  dependencies, source slots, verification, or conflict rules.
- Linting, Knip, dependency update intent, package manager baseline, and
  generated examples as first-class acceptance surfaces.
- Dry-run and print-spec behavior that proves the plan without writing ordinary
  scaffold output.

## PRD Ordering

The remaining rebuild work should be tracked in this order:

1. Integrate `effect-harness` as a provider artifact and lifecycle adapter.
2. Split create into deep modules for capability registry, logical surfaces,
   templates/source emission, and materializers.
3. Refactor core implementation and tests to native Effect v4 patterns.
4. Recover the useful generated-project ability surface from create-yume through
   the new model.
5. Expand generated smoke and contract gates so regressions are caught at the
   generated project boundary.

Each PRD should point back to this matrix and prove which gates it advances.
