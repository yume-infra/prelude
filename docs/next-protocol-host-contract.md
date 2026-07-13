---
audience: [agent, human]
authors: [codex]
reviewed_by: [sayori]
purpose: Record accepted post-V1 host-contract decisions and the remaining design branches.
status: active
updated: 2026-07-13
---

# Next-Protocol Host Contract

## Relationship To Released V1

The released V1 behavior remains the historical baseline described by the
other active architecture documents. This document records accepted successor
semantics while the next shared Contract is being designed; it does not claim
that released packages or the current repository residue already implement
them.

Prelude remains a domain-blind, stateless convergence host. The next protocol
changes where committed Integration truth lives and how one Integration scopes
several Target packages. It does not restore provider discovery, create flows,
receipts, manifests, or applied state.

## Accepted Control And Scope Baseline

- `.prelude/config.jsonc` is the sole committed Prelude Configuration. A root
  `prelude.config.jsonc` is not part of the next protocol.
- Prelude identifies the Control Root by searching upward for the nearest
  `.prelude/config.jsonc`.
- Each Integration Workspace is directly
  `.prelude/<encoded-integration-id>/`; there is no `integrations/` layer.
- `.prelude/` is committed Target content, not ignored runtime state or cache.
- `.prelude/` contains no manifests, receipts, applied-state inventories,
  previous Plans, rollback journals, runtime locks, or caches.
- Each Integration has a nonempty, explicitly committed `packageRoots`
  collection. The Target, not Prelude or a Harness Module, grants this scope.
- Newly added workspace packages are never silently discovered and claimed. A
  skill may suggest candidates, but only committed configuration authorizes
  them.
- One Integration may cover several Package Roots while projecting managed
  knowledge once into its Integration Workspace.
- Effect feedback and Psychogram wiki content live as target-owned domain
  content inside their respective Integration Workspaces. Their exact domain
  subpaths remain Harness-owned semantics and are not Prelude abstractions.
- Prelude may itself select Effect Harness in a later migration, after the new
  Effect Harness Artifact and shared Contract are ready.

Root `package.json` and `pnpm-lock.yaml` continue to select the exact Prelude
and Harness Artifacts. Committed configuration selects Integrations and their
authorized Package Roots; it does not duplicate Artifact versions.

## Output Locator Roots

The next Contract needs semantic locator roots instead of implicitly prefixing
every Output with one Integration package root. The exhaustive target-side
root set is:

- **Control Root** for Target-wide shared files such as root `AGENTS.md` and
  editor entry points;
- **Integration Workspace** for the one committed
  `.prelude/<encoded-integration-id>/` namespace owned by an Integration;
- **Package Root** for package-specific surfaces under one authorized member of
  that Integration's `packageRoots` collection.

There is no arbitrary Target-relative fourth root. Artifact assets are the
source side of a declaration and do not form another Output target root. In a
single-package Target, Control Root and Package Root `.` may resolve to the same
physical directory while retaining distinct authority semantics.

Every Output explicitly selects its semantic root in Contract data. No default
comes from the Integration, Output capability, or relative path. Harness-side
builders may reduce repetition, but the decoded Module Plan is complete and
unambiguous.

## Remaining Decision Order

1. Read-only observation authority for the three host roots and Artifact
   assets.
2. Requirement and Check roots, including whether Control Root Checks exist.
3. Reversible cross-platform Integration id encoding and rename semantics.
4. Exact Control Root discovery boundaries and symlink behavior.
5. Breaking config, Module protocol, Plan schema, and execution-hash version
   changes.
6. Root-aware containment, conflict, observation, ordering, and ownership
   evidence in the Plan Document.
7. User-authorized migration and reconciliation, with an exact candidate diff
   before any mutation or deletion.

Effect-specific policy, documentation subpaths, and failure-routing semantics
remain outside this host decision process until Effect Harness returns a
concrete shared-Contract requirement.
