# Prelude Rebuild Plan

This document translates the final architecture into implementation direction.
It is intentionally not a migration plan.

## Goal

Rebuild `prelude` into a project genesis system whose only creation path is:

```text
CreateSpec
  -> Resolver
  -> ResolvedGraph
  -> Capability Contributions
  -> Surface Materializers
  -> WritePlan
  -> Files + .prelude/manifest.json
```

The rebuild succeeds when old generator concepts are no longer required to
explain, extend, or verify project creation.

## Non-Negotiables

- No migration state as target architecture.
- No compatibility adapter as target architecture.
- No project-local Trellis baseline.
- No project-local old workflow skills.
- No preset product model.
- No `ProjectConfig` creation truth.
- No Plan / PlanSpec creation truth.
- No Handlebars-style rendering.
- No global template-rendering layer.
- No capability-owned direct writes to shared files.
- No ordinary scaffold lifecycle update.
- No manifest-as-desired-truth model.
- No provider-level blanket managed lifecycle.
- No cross-capability template inheritance or textual includes.
- No last-writer-wins physical writes.

If old code blocks these rules, delete it.

## What To Delete

Delete or replace these concepts from the implementation:

- preset registry as a first-class model
- preset aliases as product API
- `ProjectConfig` as the generator's canonical state
- Plan / PlanSpec as the generator's canonical write model
- template pointer plus params bag rendering
- `.hbs` files and Handlebars helpers
- capability code that writes or patches shared files directly
- update logic that treats ordinary scaffold output as managed state
- update logic that derives desired state from the manifest
- provider lifecycle flags that make every provider output managed
- provider paths outside `.prelude/providers/<provider-id>/**`
- template inheritance trees and cross-capability partials/includes

Historical generated examples may be regenerated from the new pipeline instead
of kept to protect old behavior.

## What To Build

Build these modules around the final model:

### CreateSpec

The complete, canonical creation input.

It records topology, package scopes, selected capabilities, selected providers,
and explicit overrides. It does not name renderer assets or physical write
steps.

### Resolver

The resolver turns `CreateSpec` into `ResolvedGraph`.

It owns defaults, pin selection, provider selection, capability dependencies,
conflict checks, topology expansion, and package scoping.

### Capability Registry

Capabilities are user-understandable project abilities.

Each capability declares typed contributions, requirements, conflicts,
verification requirements, and optional provider dependencies. A capability does
not write files.

### Contribution Model

Contributions are typed requests against logical surfaces or opaque artifact
requests owned by one materializer.

Examples:

- package dependency contribution
- package script contribution
- app shell slot contribution
- tool config contribution
- provider lifecycle surface declaration

Contributions are data. They are not file patches.

Each contribution declares lifecycle:

```text
handoff | managed
```

The default is handoff unless the contribution explicitly declares managed and
the target surface has a stable reconcile contract.

Managed contributions also declare owner or owners, scope, locator, conflict
policy, contract version, implementation version, and snapshot behavior.

### Surface Materializers

Each logical surface has one owner materializer.

Examples:

- `PackageJsonMaterializer`
- `TsConfigMaterializer`
- `KnipMaterializer`
- `EslintConfigMaterializer`
- `ReactAppMaterializer`
- `ProviderManifestMaterializer`
- `ProviderArtifactMaterializer`

Materializers merge contributions, reject conflicts, and emit `WritePlan`
operations.

One physical path has one materializer and one writer. If multiple capabilities
need the same path, they must contribute to the same logical surface. Identical
text is not enough to share ownership.

### WritePlan

`WritePlan` is the only side-effect plan.

It contains explicit operations such as:

- `writeStructuredFile`
- `writeStructuredField`
- `writeManagedBlock`
- `writeManagedFile`
- `writeGeneratedUserFile`
- `writeSourceFile`
- `callProviderStatus`
- `callProviderVerify`
- `callProviderPlanUpdate`
- `runCommand`

There is no `renderTemplate` operation.

### Manifest Ledger

`.prelude/manifest.json` records creation provenance and lifecycle provider
state after successful apply and verification.

The manifest is reconciliation base, not desired truth. Update derives desired
state from config, lock, and the current capability/provider implementation;
it compares that desired state against manifest base and filesystem current.

It records:

- schema version
- prelude version
- create spec
- resolved graph
- prelude-owned pins
- lifecycle providers
- managed claims and surfaces
- handed-off scaffold provenance
- verification records

It does not grant update authority over ordinary scaffold output.

### Lifecycle Provider Runtime

Lifecycle providers expose:

```ts
status(record)
verify(record)
planUpdate(record, options)
```

Providers do not write files. `prelude` validates provider-declared managed
contributions, operations, or migration plans and applies them through the write
boundary.

Provider runtime assets and integration surfaces may be managed. Provider demos,
examples, and ordinary source output remain handoff unless their contributions
explicitly declare managed lifecycle.

## Rendering Replacement

The new system does not render Handlebars templates or use a global template
engine.

File generation is surface-owned:

- JSON/YAML/TOML surfaces are generated from structured values.
- package manifests are generated from typed package contributions.
- TS/JS config files are generated by dedicated materializers.
- app source files are generated by the owning app materializer.
- provider artifacts are written through provider namespace materializers.

`prelude` pursues semantic single authority, not text-level DRY. Default to
complete, local, readable templates when one capability owns an output. Promote
to typed logical surfaces only at contention or reconciliation boundaries.

Promotion triggers:

- multiple capabilities express opinions about one semantic resource
- independent add/remove/update is needed
- stable identity or long-term reconcile is needed
- conflict diagnostics must be explainable

Composition happens in typed models where semantic competition exists. It does
not happen through cross-capability template conditionals.

Example:

```text
react capability
  -> package-manifest dependencies.react
  -> react-app-shell rootComponent

zustand capability
  -> package-manifest dependencies.zustand
  -> react-app-shell stateProvider

ReactAppMaterializer
  -> writes src/App.tsx once
```

`zustand` does not patch `src/App.tsx`. It contributes to the React app shell
surface. The React app materializer owns the final source file. That file may
still be handoff after create.

Template rules:

- allow complete file copy
- allow small explicit variable substitution
- allow local helper functions inside one materializer
- forbid cross-capability template inheritance
- forbid cross-capability textual includes
- forbid global capability-list `if` branches inside templates

## Acceptance Criteria

The rebuild is aligned when:

- every creation path emits or accepts a canonical `CreateSpec`
- the resolver produces the complete `ResolvedGraph`
- all capabilities contribute typed data instead of writing files
- every physical file or managed block has one owner materializer
- `WritePlan` contains no template-render operation
- no `.hbs` file is required for generation
- generated projects receive `.prelude/manifest.json`
- ordinary scaffold contributions default to handoff lifecycle
- managed lifecycle is declared per contribution
- manifest is used as reconciliation base, not desired truth
- update compares desired/base/current logical values
- lifecycle update is managed-surface scoped
- incompatible contract transitions block when identity, ownership topology, or
  semantics cannot be proven continuous
- `effect-harness` uses `.prelude/providers/effect-harness/**`
- provider migration plans are declarative and core-executed
- docs do not point agents to old workflow skills or old project baselines
