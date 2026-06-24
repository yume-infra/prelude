# Manifest Materialization Architecture

This document explains how `prelude` should turn a user request into files while
remaining composable, while leaving only explicit lifecycle provider surfaces
updatable after creation.

The core rule is:

```text
Capabilities do not write shared files directly.
Capabilities contribute to logical surfaces.
One materializer owns each physical write.
The manifest records the resolved graph, handed-off provenance, and lifecycle
surfaces after verification.
```

## Why This Exists

`prelude` should support free composition:

- topology: single package or workspace
- package families: React, Vue, Node, CLI, library, Effect
- engineering capabilities: linting, Knip, dependency update tooling
- AI harness providers such as `effect-harness`
- guided CLI as a `CreateSpec` builder
- direct spec input for agent, CI, scripts, and repeatable generation

That cannot be implemented safely as "every capability emits or patches the
files it cares about." Many capabilities naturally want the same file:

- `package.json`
- root workspace config
- `AGENTS.md`
- app shell source files
- verification scripts
- provider manifests

The architecture must prevent write-order bugs, accidental overwrite, and future
lifecycle update guessing.

## Core Objects

### CreateSpec

The confirmed project creation specification before pins, provider versions, and
materialization choices are applied.

Examples:

- "single package React app with Jotai, Knip, linting, and AI harness"
- "workspace with one React app and one Effect package"
- a reusable `CreateSpec` file maintained by Sayori

`CreateSpec` is kept in the manifest as creation provenance and provider
context. It is not a promise that `prelude` will reapply the full scaffold under
newer pins after day one.

`CreateSpec` may omit defaults. Defaults are applied by the resolver and recorded
in the resolved graph, not backfilled into the spec.

`CreateSpec` is closed. It does not support include, import, extends, or remote
references. Composition is performed by capabilities and the resolver after the
complete spec has been parsed.

### Resolved Graph

The concrete answer after `prelude` applies defaults, pins, provider versions,
scope rules, and conflict resolution.

The resolved graph is what generation actually follows. It must include:

- topology
- packages
- root capabilities
- package capabilities
- selected providers
- version pins
- materialization plan inputs

The resolved graph is creation truth. Lifecycle providers may use it as context,
but lifecycle update does not compare and reapply the whole project graph.

### Capability Contribution

A capability contribution is a typed request to add something to a logical
surface.

Examples:

- add `react` to package dependencies
- add `knip` script to root `package.json`
- add a Vite dev script to an app package
- add a React provider slot to the app shell
- add a provider-owned surface declaration for `effect-harness`

Contributions are not file writes.

Capability granularity is higher than a contribution. A capability is a
user-understandable project ability; a contribution is how that capability
affects logical surfaces.

### Logical Surface

A logical surface is a merge point with an owner and rules.

Examples:

- `package-manifest:root`
- `package-manifest:packages/web`
- `react-app-shell:packages/web`
- `agents-root-instructions`
- `provider:effect-harness`

Logical surfaces solve the "multiple pointers to the same content" problem. A
capability points to a logical surface and a typed slot, not to arbitrary text in
a file.

### Materializer

A materializer turns one logical surface into physical operations.

Examples:

- package manifest materializer writes `package.json`
- React app shell materializer writes `src/App.tsx`
- managed block materializer updates a marked block in `AGENTS.md`
- provider lifecycle materializer validates provider-declared operations and
  writes provider artifacts under `.prelude/providers/<id>/**`

One materializer owns the final write for a physical file or managed block.

### Operation

An operation is the explicit side effect that the apply step may execute.

Initial operation types:

- `writeSourceFile`
- `writeStructuredField`
- `writeManagedBlock`
- `writeManagedFile`
- `writeGeneratedUserFile`
- `callProviderStatus`
- `callProviderVerify`
- `callProviderPlanUpdate`
- `runCommand`

Operations must declare:

- target path or provider target
- owning capability or provider
- surface authority
- create behavior
- lifecycle update behavior, when any
- verification or snapshot rule

There is no `renderTemplate` operation. Handlebars-style `template + params bag`
rendering is not part of the final architecture. Materializers emit complete
files or structured changes from typed surface data.

### Surface Snapshot

A snapshot is the manifest record used for drift detection when an active
lifecycle surface has `owner` or `bounded` authority.

Snapshot forms:

- whole-file hash for managed files
- block hash for managed blocks
- structured value or hash for JSON/YAML/TOML pointers
- provider-reported digest for provider-owned surfaces

`none` authority surfaces are different. They are handed-off surfaces: their
records are provenance, not lifecycle snapshots. An initial hash may be recorded
for audit, but lifecycle update must not use it as a drift gate.

### Manifest

The manifest is the root ledger written after successful generation or lifecycle
update.

Expected generated path:

```text
.prelude/manifest.json
```

It should include:

- `schemaVersion`
- `preludeVersion`
- `createSpec`
- `resolvedGraph`
- `pins`
- `lifecycleProviders`
- `lifecycleSurfaces`
- `generatedUserSurfaces`

The manifest is not the source used to write initial files. It is the durable
state used to verify lifecycle ownership and make provider-scoped update
deterministic.

## Create Flow

```text
input
  -> parse CreateSpec
  -> resolve topology and capability graph
  -> resolve pins and providers
  -> collect contributions
  -> merge logical surfaces
  -> preflight conflicts
  -> build operations
  -> apply operations
  -> run verification
  -> snapshot lifecycle surfaces and handed-off provenance
  -> write .prelude/manifest.json
```

The manifest is written last. A failed create should not claim a generated
project state that was not actually produced and verified.

## Lifecycle Update Flow

```text
read .prelude/manifest.json
  -> validate manifest schema
  -> select active lifecycle providers
  -> validate provider contract schemas
  -> ask providers for status/update plans
  -> check provider-owned lifecycle surfaces against snapshots or provider reports
  -> block on lifecycle drift
  -> validate provider-declared operations against provider namespace or declared lifecycle surfaces
  -> dry-run or apply operations
  -> run provider verification
  -> snapshot updated lifecycle surfaces
  -> write updated manifest
```

Lifecycle update must block when:

- the manifest schema version is unsupported
- a provider contract schema version is unsupported
- no active lifecycle provider exists
- an active provider-owned `owner` surface or `bounded` region was manually
  changed
- the provider update plan requires changing a `none` authority surface
- a provider lifecycle conflict has no deterministic rule
- the provider update plan targets an undeclared external surface
- provider major version drift requires redesign

Lifecycle drift blocks. Lifecycle update does not repair, reconcile, or
reinterpret drift.

## Conflict Rules

Conflict detection happens before writes.

For structured surfaces:

- different keys merge
- same key with identical value dedupes
- same key with compatible value may merge only if the surface owner declares a
  rule
- same key with incompatible value blocks

For managed files:

- only one materializer may own a whole file
- other capabilities must contribute through declared slots

For managed blocks:

- each block id has exactly one owner
- adjacent user content is extension surface and must be preserved

For bounded selectors:

- v1 supports managed block markers
- v1 supports structured pointers for structured files such as JSON, YAML, and
  TOML
- v1 does not support line ranges, regex ranges, AST nodes, or semantic source
  regions

For provider surfaces:

- provider owns lifecycle semantics
- `prelude` records provider artifact, contract version, declared surfaces, and
  provider status
- `prelude` owns the write boundary
- providers do not write project files directly
- provider internal artifacts live under `.prelude/providers/<id>/**`
- external project writes are allowed only for lifecycle surfaces declared at
  create

## Example: package.json

Input composition:

```text
single package
React app
Jotai state management
Knip
linting
AI harness disabled
```

Contributions:

```text
react capability
  -> package-manifest:root dependencies.react
  -> package-manifest:root dependencies.react-dom
  -> package-manifest:root devDependencies.vite
  -> package-manifest:root scripts.dev
  -> package-manifest:root scripts.build

jotai capability
  -> package-manifest:root dependencies.jotai
  -> react-app-shell:root providerSlots.state

knip capability
  -> package-manifest:root devDependencies.knip
  -> package-manifest:root scripts.knip
  -> managed-file:knip.json

linting capability
  -> package-manifest:root devDependencies.eslint
  -> package-manifest:root scripts.lint
```

Only the package manifest materializer writes `package.json`.

If two capabilities request `/scripts/lint` with different values, generation
blocks unless the package manifest surface declares a deterministic composition
rule.

Create ledger record:

```json
{
  "path": "package.json",
  "kind": "structured-field",
  "owner": "package-manifest",
  "authority": "none",
  "createContributions": {
    "/dependencies/react": {
      "owner": "capability:react",
      "value": "19.2.7"
    },
    "/dependencies/jotai": {
      "owner": "capability:jotai",
      "value": "2.15.0"
    },
    "/scripts/lint": {
      "owner": "capability:linting",
      "value": "eslint ."
    }
  }
}
```

After create, these ordinary scaffold entries are handed off. If the user edits
`/dependencies/react`, lifecycle update must not care. The same physical
`package.json` may still contain provider-owned bounded entries, but only those
provider-declared pointers are lifecycle surfaces.

Example provider-owned bounded entry:

```json
{
  "path": "package.json",
  "kind": "structured-field",
  "owner": "provider:effect-harness",
  "authority": "bounded",
  "pointers": {
    "/devDependencies/@effect/platform": {
      "value": "0.97.0",
      "snapshot": "0.97.0"
    }
  }
}
```

On lifecycle update, drift in the provider-owned pointer blocks provider update.
Drift in ordinary React, Jotai, Knip, or linting entries is outside the update
surface.

## Example: React App Shell

Wrong model:

```text
React feature writer patches src/App.tsx
Router patches src/App.tsx
State management patches src/App.tsx
CSS framework patches src/App.tsx
AI harness patches src/App.tsx
```

This causes order dependence and unknown ownership.

Better model:

```text
react-app-shell logical surface
  owner: capability:react
  physical file: src/App.tsx

slots:
  imports
  providerWrappers
  routes
  demoBlocks
  classNameTokens
```

Contributions:

```text
router capability
  -> react-app-shell routes
  -> react-app-shell imports

jotai capability
  -> react-app-shell providerWrappers
  -> react-app-shell imports

tailwind capability
  -> react-app-shell classNameTokens
```

The React app shell materializer emits `src/App.tsx` once.

However, the safer default is still to treat demo source files as
generated-user surfaces after create. Lifecycle update should only keep managing
app shell files when there is an explicit lifecycle provider contract and stable
slots. Without that contract, source files should not be touched after initial
generation.

## Provider Harnesses

`prelude` selects and orchestrates harness providers. Providers own harness
semantics.

For `effect-harness`, the first useful adapter can be narrow:

```text
status(lifecycleProviderRecord)
verify(lifecycleProviderRecord)
planUpdate(lifecycleProviderRecord, options)
```

`prelude` owns:

- selecting the provider
- recording provider artifact and contract version
- checking provider freshness
- invoking provider lifecycle planning and verification
- validating provider-declared operations
- applying provider-declared writes through `prelude` materializers
- integrating provider status into overall verification

The provider owns:

- Effect source pin
- Effect package baseline
- runtime files
- agent routes
- guardrails
- provider-owned update policy
- provider-owned lifecycle semantics
- provider-owned surface summaries or digests

Do not extract a shared `harness-core` module until at least two provider
adapters prove the common interface. One adapter is not enough evidence for a
shared abstraction.

Provider lifecycle artifacts are centralized under:

```text
.prelude/providers/<provider-id>/**
```

There is no dual path. For `effect-harness`, use:

```text
.prelude/providers/effect-harness/**
```

not `.effect-harness/**`.

Provider update plans may only replace declared lifecycle surfaces:

- owned provider files under `.prelude/providers/<provider-id>/**`
- managed blocks declared at create
- structured pointers declared at create
- explicitly declared owned files

Provider update plans must not use arbitrary patches, git diffs, source rewrites,
direct writes, or direct side-effect commands. If a provider needs a new external
surface, lifecycle update must block for explicit migration or redesign.
