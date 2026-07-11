---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 把最终架构转成重建执行方向，并列出禁止恢复的旧模型。
status: archived
sources:
  - docs/create-maintain-architecture.md
  - docs/prelude-final-state.md
updated: 2026-06-29
---

# Prelude Rebuild Plan

## Goal

重建后的 `prelude` MUST have two mainlines.

```text
create   = 一次性 genesis
maintain = 有状态 lifecycle
```

`create` 的目标路径是：

```text
CreateSpec
  -> create resolver
  -> resolved create graph
  -> capability modules
  -> create contributions
  -> create surfaces
  -> create WritePlan
  -> files
  -> create verification
  -> handoff
```

`maintain` 的目标路径是：

```text
maintain config
  -> maintain resolver
  -> managed claims
  -> maintain manifest provider references
  -> provider records
  -> status | verify | update
  -> desired/base/current reconcile
  -> maintain WritePlan
  -> managed surface updates
  -> refreshed provider records
  -> refreshed manifest references
```

The rebuild succeeds when rejected generator concepts are no longer required to explain, extend, verify, or maintain project creation.

## Non Negotiables

- No transitional state as target architecture.
- No compatibility layer as target architecture.
- No project-local Trellis baseline.
- No project-local rejected workflow skills.
- No preset product model.
- No `ProjectConfig` creation truth.
- No Plan or PlanSpec creation truth.
- No Handlebars-style rendering.
- No global template-rendering layer.
- No capability-owned direct writes to shared files.
- No ordinary scaffold lifecycle update.
- No create manifest ledger for ordinary scaffold.
- No manifest-as-desired-truth model.
- No domain-wide blanket managed lifecycle.
- No cross-capability template inheritance or textual includes.
- No last-writer-wins physical writes.

If rejected implementation code blocks these rules, delete or replace it.

## Delete

The implementation SHOULD delete or replace:

- preset registry as a first-class model
- preset aliases as product API
- `ProjectConfig` as canonical creation state
- Plan or PlanSpec as canonical write model
- template pointer plus params bag rendering
- `.hbs` files and Handlebars helpers
- capability code that writes or patches shared files directly
- update logic that treats ordinary scaffold output as managed state
- update logic that derives desired state from the manifest
- domain-wide flags that make every domain output managed
- writes outside the maintain-owned namespace when a maintain domain owns that namespace
- template inheritance trees and cross-capability partials/includes

Historical generated examples MAY be regenerated from the new pipeline.

Historical generated examples MUST NOT protect historical implementation behavior.

## Build Create

### CreateSpec

`CreateSpec` is the complete canonical create input.

It records topology, package scopes, selected create capabilities, selected maintain behavior, and explicit overrides.

It MUST NOT name renderer assets or physical write steps.

### Create Resolver

The create resolver turns `CreateSpec` into a resolved create graph.

It owns defaults, pin selection, capability dependencies, conflict checks, topology expansion, package scoping, and maintain initialization selection.

It MUST NOT produce maintain desired truth for ordinary scaffold.

### Capability Modules

Capabilities are user-understandable create abilities.

Each capability SHOULD declare:

- id and label
- scope
- requirements
- conflicts
- create surfaces
- create contributions
- create verification expectations
- guided visibility when relevant

A capability MUST NOT write shared files directly.

### Create Surfaces

Create surfaces are semantic merge points.

Each create surface has one owner materializer.

Materializers merge contributions, reject conflicts, and emit create WritePlan operations.

One physical path MUST have one writer.

If multiple capabilities need the same path, they MUST contribute to the same create surface.

Identical text is not enough to share ownership.

### Create WritePlan

Create WritePlan is the only create side-effect plan.

It MAY contain explicit operations such as:

- `writeStructuredFile`
- `writeGeneratedUserFile`
- `writeExecutableFile`
- `initializeMaintain`
- `runCommand`

It MUST NOT contain `renderTemplate`.

## Build Maintain

### Maintain Core

Maintain is a core product ability.

Maintain owns status, verify, update, drift check, maintain WritePlan, provider record base refresh, and manifest reference refresh.

Maintain MUST NOT update ordinary scaffold.

### Maintain Manifest

`.prelude/manifest.json` is the maintain manifest.

The maintain manifest records maintain provider references, not ordinary scaffold creation provenance.

It SHOULD record:

- schema version
- enabled maintain providers
- provider record paths
- provider contract identity
- provider implementation/profile identity
- maintain verification records

It SHOULD NOT record ordinary scaffold provenance records.

Provider records under `.prelude/providers/<provider-id>/provider.json` SHOULD record managed claims, locators, base snapshots, provider options, provider profile, and runtime metadata.

### Maintain Domains

Maintain domains provide managed semantics.

`effect-harness` is currently the first maintain domain.

Maintain domains MUST NOT write project files directly.

Maintain core validates domain-declared operations before applying them.

## Rendering

The new system does not render Handlebars templates or use a global template engine.

File generation is surface-owned.

`prelude` optimizes for semantic single authority and open/closed extensibility before template reuse.

Default to complete, local, readable templates when one capability owns an output.

Promote to typed create surfaces when:

- multiple capabilities express opinions about one semantic resource
- independent add, remove, or update behavior is needed
- stable identity is needed
- conflict diagnostics must be explainable

Template rules:

- Complete file copy is allowed.
- Small explicit variable substitution is allowed.
- Local helper functions inside one materializer are allowed.
- Cross-capability template inheritance is forbidden.
- Cross-capability textual includes are forbidden.
- Global capability-list conditionals inside templates are forbidden.

## Semantic Import Gate

Historical create-yume templates are semantic inventory.

Historical create-yume templates MUST be classified before import.

Each historical template fragment SHOULD become one of:

- create capability semantics
- create surface semantics
- CreateSpec recipe semantics
- create verification expectation
- maintain domain semantics
- out-of-scope historical evidence

Historical template fragments MUST NOT be copied as a new global template system.

## Acceptance

The detailed validation contract is recorded in
[`prelude-rebuild-acceptance-matrix.md`](./prelude-rebuild-acceptance-matrix.md).

At minimum, the rebuild is aligned when:

- every create path emits or accepts a canonical `CreateSpec`
- the create resolver produces the complete resolved create graph
- capabilities contribute typed data instead of writing shared files
- every physical file has one owner materializer
- create WritePlan contains no template-render operation
- no `.hbs` file is required for generation
- ordinary scaffold is handed off after create verification
- maintain manifest records only managed lifecycle state
- maintain update compares desired/base/current logical values
- maintain update is managed-surface scoped
- incompatible contract transitions block when identity or semantics cannot be proven
- docs do not point agents to rejected workflow skills or rejected project baselines
