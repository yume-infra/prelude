---
status: accepted
date: 2026-07-10
amended: 2026-07-12
---

# Integration selection authorizes Harness surfaces

Committing a Harness Integration authorizes that selected Harness Module to propose its complete versioned surface contract for the configured Target Scope. The target does not approve or override individual locators, values, or shared-file claims. Harness-specific semantics and placement remain self-contained in the Harness Module.

V1 Target Scope is one exact `packageRoot`. Config has no Harness-defined options. Repository-level Harness surfaces such as policy documents, agent routing, and shared tooling configuration are part of the selected Harness contract rather than separate target grants.

Prelude validates root containment, exact package membership, contract schemas, deterministic ownership, and global cross-Harness composition. Existing content that differs at a valid authoritative locator becomes a visible planned change. Managed Trees include exact deletions inside their roots; omission of a bounded Output does not delete prior content. Unsupported target shape, unsafe path topology, incomplete preparation, and cross-Harness conflict hard block. A user-authorized skill may prepare the target, after which Prelude replans from observed state.

## Consequences

Integration selection is authority to plan, not authority to write an unseen change. Every mutation still requires one exact approved Convergence Plan. The target cannot weaken a Harness through local overrides. Cross-Harness conflicts are upstream Harness design defects to resolve, not target-level last-writer choices. Prelude stamps integration ownership onto returned claims rather than trusting module-supplied owner fields.
