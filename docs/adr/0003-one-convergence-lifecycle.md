---
status: accepted
date: 2026-07-10
amended: 2026-07-12
---

# Use one convergence lifecycle

The former create and maintain mainlines are superseded. Initial convergence, artifact upgrade, and Integration configuration change all compare the current target directly with the current selected Harness desired state and use one plan/apply/check lifecycle.

## Consequences

The initial target must already have package-manager selection and Harness Integration config. A user-authorized skill creates that control plane; Prelude core has no create, init, remove, or transition lifecycle. V1 does not promise Integration removal. There is no previous applied state or separate maintenance model.
