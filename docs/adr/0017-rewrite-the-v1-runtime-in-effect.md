---
status: accepted
date: 2026-07-12
---

# Rewrite the V1 runtime in Effect

Prelude V1 is specified by its observable convergence behavior and real Effect Harness plus Psychogram outcome in Partita, not by preservation of existing TypeScript declarations, module layout, helper APIs, or implementation code. The current create/provider implementation is disposable and may be deleted wholesale. Reuse is justified only when code already expresses the new boundary cleanly.

The production runtime is written in Effect v4. Core orchestration, dependency injection, typed failure, filesystem and path access, process execution, resource lifetime, interruption, concurrency, and test integration use the corresponding Effect and `@effect/platform` facilities rather than parallel Promise, exception, global singleton, or hand-rolled service frameworks. Temporary-resource cleanup uses Effect scopes while retaining the accepted limitation that process death is not a durable transaction.

The shared contract and committed config use canonical Effect Schema codecs from which TypeScript types and JSON-compatible wire values are derived. Harness Modules still exchange plain contract data and Prelude still contains no Effect Harness domain policy; Effect is the implementation substrate, not a reason to couple Harness content to Prelude.

## Consequences

Architecture documents prioritize invariants, externally visible plans, blockers, writes, and checks over illustrative interface syntax. Implementers should reshape code around Effect-native deep modules instead of wrapping the old architecture in superficial Effects. Acceptance is led by packed Artifact tests and the real Partita end state, with focused unit tests supporting those outcomes.
