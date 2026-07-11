---
status: accepted
date: 2026-07-10
amended: 2026-07-12
---

# Approval binds a recomputed plan and apply is rerunnable

A Convergence Plan is a versioned machine-readable document with a canonical execution hash. Interactive approval authorizes the displayed hash; non-interactive apply must receive the expected hash explicitly. A plan file, package update, or generic confirmation flag cannot authorize a newly computed plan.

Apply acquires an exclusive target write boundary, replans against the current target and selected Artifacts, and compares the newly computed execution hash with the expected hash before writing. A changed execution payload requires a new plan and approval.

V1 does not promise whole-plan rollback. Shared text and JSON/JSONC files are staged beside the target and published through the strongest supported single-file primitive. A Managed Tree is fully staged and digest-checked before its replace sequence, but directory replacement is not described as crash-atomic. Effect scopes may clean unpublished temporary content while the runtime remains alive; they are not durable recovery.

If apply fails after some outputs were published, Prelude reports failure and never marks the target converged. A new plan observes completed outputs as no-ops and the remainder as pending. The user approves and reruns that plan. There is no multi-output rollback journal.

## Consequences

Every published value must belong to the approved execution payload. Path containment, no-follow checks, preimage validation, deterministic materialization, and post-write observation remain required. `prelude check` fails while any current declared output is not converged. Stronger crash recovery may be added later without changing the Harness Module contract.
