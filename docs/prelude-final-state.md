# Prelude Final State

This document describes the final architecture `prelude` should converge on.
The point is to state what the system looks like when the design is correct.

## One Sentence

`prelude` is a project genesis system that turns Sayori's original project
intent into an agent-ready, version-owned, provider-aware workspace through one
composition pipeline.

## Final Product Shape

`prelude` has multiple user-facing entry points, but only one internal creation
model.

- Preset mode is a saved original intent.
- Normal CLI mode is an interactive original intent builder.
- Spec mode is a serialized original intent.

After input collection, every entry point enters the same resolver:

```text
input adapter
  -> original intent
  -> resolved graph
  -> capability contributions
  -> logical surfaces
  -> materializers
  -> operation plan
  -> apply
  -> verify
  -> manifest
```

No preset, prompt branch, or spec adapter may bypass this path.

## Core Runtime Model

### Original Intent

Original intent records what the user meant before defaults, pins, provider
versions, and conflict rules are applied.

It contains:

- topology choice
- package list
- root capability choices
- package capability choices
- provider choices
- explicit user overrides
- preset identity, if the user started from a preset

Original intent is durable. Update re-resolves it instead of reading intent from
the file tree.

### Resolved Graph

Resolved graph is the concrete generation answer.

It contains:

- topology
- root package
- workspace packages
- capability graph
- package scopes
- provider selections
- prelude-owned pins
- provider artifact and contract versions
- logical surfaces
- selected materializers
- verification surface

The resolved graph is deterministic for a fixed `prelude` version, pin set, and
provider artifact set.

### Capability

A capability is a scoped unit of project behavior.

Examples:

- React app capability
- Vue app capability
- Node runtime capability
- CLI capability
- library capability
- linting capability
- Knip capability
- dependency update capability
- AI harness capability

A capability declares:

- id
- root or package scope
- compatible topology
- required inputs
- default inputs
- prelude-owned pins it consumes
- provider dependencies, if any
- logical surface contributions
- conflict rules
- verification requirements

A capability does not write shared files directly.

### Topology

Topology is resolved before framework selection.

Supported topology shapes:

- single package
- workspace

Root-level capabilities manage root surfaces. Package-level capabilities manage
package-local surfaces.

Workspace root surfaces and package runtime surfaces are separate scopes. Root
Knip, root `AGENTS.md`, provider manifests, workspace scripts, and workspace
verification are not mixed with React, Vue, Node, CLI, or library package
surfaces.

## Logical Surfaces

A logical surface is a named merge point with an owner and write rules.

Examples:

- `package-manifest:root`
- `package-manifest:packages/web`
- `workspace-manifest:root`
- `agents-root-instructions`
- `react-app-shell:packages/web`
- `provider:effect-harness`

Capabilities contribute typed slots to logical surfaces. They do not patch
physical files.

Examples:

```text
react capability
  -> package-manifest:packages/web dependencies.react
  -> package-manifest:packages/web scripts.dev

jotai capability
  -> package-manifest:packages/web dependencies.jotai
  -> react-app-shell:packages/web providerWrappers.state

knip capability
  -> package-manifest:root devDependencies.knip
  -> package-manifest:root scripts.knip
  -> managed-file:root knip.json
```

One logical surface has one materializer. One physical file or managed block has
one writer.

## Materializers

A materializer owns the physical write for one logical surface.

Examples:

- package manifest materializer writes `package.json`
- workspace manifest materializer writes `pnpm-workspace.yaml`
- managed block materializer writes a marked block in `AGENTS.md`
- generated-user materializer creates user-owned source files
- provider materializer invokes a provider adapter

Materializers produce operations. They also define how surfaces are snapshotted
for future update.

## Operations

Operations are the only side-effect layer.

Operation kinds:

- `writeStructuredField`
- `writeManagedFile`
- `writeManagedBlock`
- `writeGeneratedUserFile`
- `renderManagedTemplate`
- `callProvider`
- `runCommand`

Every operation declares:

- operation id
- owner
- logical surface
- target path or provider target
- surface category
- create behavior
- update behavior
- snapshot rule
- verification rule

Template rendering, JSON editing, copying files, and running commands are
implementation details behind operations.

## Surface Categories

Every emitted surface belongs to exactly one category.

### Core Managed Surface

Owned by `prelude` or a provider.

Update may change it only when:

- the manifest says the surface is managed
- the current surface still matches the previous snapshot
- the new resolved graph requires the change

Manual drift blocks ordinary update.

### Extension Surface

Designed for user or agent extension.

Update preserves it. A materializer may update adjacent managed blocks but must
not rewrite extension content.

### Generated-User Surface

Generated once, then handed to the project owner.

Update does not modify it. User source files default to this category unless an
explicit managed shell contract exists.

## Manifest

Every `prelude`-managed project has one root manifest:

```text
.prelude/manifest.json
```

The manifest is the single source of truth for generated project ownership.
It is not a template input. It is the durable ledger written after successful
apply and verification.

Manifest contents:

- schema version
- `prelude` version
- original intent
- resolved graph
- prelude-owned pins
- provider records
- managed surfaces
- extension surfaces
- generated-user surfaces
- verification records

Managed surface records include:

- surface id
- owner
- category
- path
- structured pointer or block id, when relevant
- snapshot value or hash
- operation id that last wrote it
- provider report id, when provider-owned

The manifest is written last. A failed apply or failed verification must not
record a successful managed state.

## Update

Update is deterministic and manifest-driven.

```text
read manifest
  -> validate manifest schema
  -> validate provider contract schemas
  -> verify current managed surfaces against snapshots
  -> re-resolve original intent
  -> compare previous resolved graph to next resolved graph
  -> build operations for managed surfaces
  -> dry-run or apply
  -> verify
  -> write manifest
```

Update blocks when:

- no manifest exists
- manifest schema is unsupported
- provider contract schema is unsupported
- core managed surface drifted
- generated-user surface would need to change
- capability conflict has no deterministic resolution
- major version drift requires redesign

Repair is not update. Repair is a separate user-approved flow.

## Providers

Providers own domain semantics that should not live in `prelude`.

`prelude` owns:

- provider selection
- provider artifact pin
- provider contract version
- provider invocation
- provider status integration
- provider record in the manifest

Provider owns:

- domain package baselines
- domain runtime files
- domain agent routes
- domain guardrails
- provider-owned managed surfaces
- provider update policy
- provider verification
- provider surface reports

Provider adapter shape:

```text
init(target, resolvedGraph)
status(target)
verify(target)
update(target, fromProviderVersion, toProviderVersion)
surfaceReport(target)
```

`effect-harness` is one provider adapter. A shared harness core only exists when
multiple real providers prove the same interface.

## Version Ownership

Version ownership follows content ownership.

`prelude` owns pins for content it emits:

- React scaffold dependencies
- Vue scaffold dependencies
- Node scaffold dependencies
- linting dependencies
- Knip/Taze tooling
- package manager baseline
- template-owned defaults

Providers own pins for content they emit:

- Effect package baseline inside `effect-harness`
- provider runtime files
- provider verifier dependencies
- provider internal source pins

Major version drift blocks ordinary update.

## Final CLI Shape

The CLI presents topology first:

```text
What are you creating?
  single package
  workspace
```

Then it asks for scoped capabilities:

```text
Root capabilities:
  linting
  knip
  dependency update tooling
  AI harness provider

Package capabilities:
  React app
  Vue app
  Node runtime
  CLI
  library
  Effect package
```

Preset mode pre-fills these answers. It does not run a separate generation
implementation.

Spec mode serializes the same original intent. It must round-trip behavior that
the resolver can generate.

## Example Final Project

User intent:

```text
workspace
root: linting, knip, dependency update tooling, ai harness
packages:
  web: React app, Jotai
  worker: Effect package with effect-harness provider
```

Resolved graph:

```text
topology: workspace
root capabilities:
  linting
  knip
  dependency-update
  ai-harness(effect-harness)
packages:
  packages/web:
    react-app
    state:jotai
  packages/worker:
    effect-package
providers:
  effect-harness
```

Materialization:

```text
package-manifest:root
  -> root package.json

package-manifest:packages/web
  -> packages/web/package.json

package-manifest:packages/worker
  -> packages/worker/package.json

agents-root-instructions
  -> AGENTS.md managed block

provider:effect-harness
  -> call effect-harness adapter
  -> record provider surface report

generated-user source surfaces
  -> packages/web/src/*
  -> packages/worker/src/*
```

Update behavior:

- root `package.json` managed pointers may update.
- provider-owned surfaces update only through provider contract.
- user source files are not rewritten.
- manual edits to core managed surfaces block.

## Invariants

- One input model after entry-point adaptation.
- One resolver for preset, CLI, and spec mode.
- One manifest per managed project.
- One owner for each managed surface.
- One materializer for each physical write.
- No capability directly patches shared files.
- No update without manifest.
- No ordinary update across unsupported schema versions.
- No ordinary update across major drift.
- No provider internals inside `prelude`.
- No generated-user source rewrite during ordinary update.
