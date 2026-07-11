---
status: accepted
date: 2026-07-10
amended: 2026-07-12
---

# Prelude is the target mutation host

Multiple real Harnesses already exist: `effect-harness` and `psychogram`. We decided that Harness Artifacts remain independently versioned, inspectable, testable, and able to calculate target-aware plans, while normal materialization for active Integrations is coordinated by Prelude. Direct per-Harness mutators were rejected because they cannot provide global ownership checks, deterministic ordering, one visible update plan, or coordinated verification when Integrations share target surfaces.

## Consequences

Harness Modules receive read-only target access and return outputs, Package Requirements, checks, and issues. Prelude composes every Integration before writing and owns normal Harness-managed materialization. Prelude-owned, user-authorized skills form the soft boundary for bootstrap, package coordination, executable-config preparation, upgrade, and residue cleanup; they remain part of the Prelude product rather than becoming per-Harness mutators. Harness domain workflows may edit target-owned domain content without turning that content into a Prelude-managed surface. Integration removal is deferred beyond V1. This is a trusted first-party module model, not a security sandbox for arbitrary npm code.
