---
status: accepted
date: 2026-07-13
---

# Commit Prelude control and Integration workspaces

The next protocol places the sole Prelude Configuration at
`.prelude/config.jsonc` and gives every Integration one committed
`.prelude/<encoded-integration-id>/` workspace. This makes Integration-scoped
managed knowledge and neighboring target-owned domain content visible together
without reviving `.prelude/` as hidden provider or applied-state storage.

Each Integration declares a nonempty `packageRoots` collection. Explicit
Target configuration authorizes package scope; Prelude and Harness Modules do
not discover and claim new workspace packages. One Integration may cover
several Package Roots while projecting its managed knowledge once into its
Integration Workspace.

## Consequences

Nearest-ancestor `.prelude/config.jsonc` discovery identifies the Control Root,
while root `package.json` and `pnpm-lock.yaml` continue to select exact
Artifacts. `.prelude/` is committed and may contain managed or target-owned
Integration content, but never manifests, receipts, Plan history, rollback
journals, runtime locks, caches, or applied-state inventories. The released V1
absence of a `.prelude/` product directory remains historical truth; adopting
this successor layout requires an explicit migration rather than a
compatibility layer.
