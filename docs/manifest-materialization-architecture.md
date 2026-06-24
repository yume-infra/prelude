# Manifest Materialization Architecture

This document explains how `prelude` should turn a user request into files while
remaining composable and upgradable.

The core rule is:

```text
Capabilities do not write shared files directly.
Capabilities contribute to logical surfaces.
One materializer owns each physical write.
The manifest records the resolved graph and managed surfaces after verification.
```

## Why This Exists

`prelude` should support free composition:

- topology: single package or workspace
- package families: React, Vue, Node, CLI, library, Effect
- engineering capabilities: linting, Knip, dependency update tooling
- AI harness providers such as `effect-harness`
- preset mode as a pre-filled composition
- normal CLI mode as explicit composition

That cannot be implemented safely as "every capability renders or patches the
files it cares about." Many capabilities naturally want the same file:

- `package.json`
- root workspace config
- `AGENTS.md`
- app shell source files
- verification scripts
- provider manifests

The architecture must prevent write-order bugs, accidental overwrite, and
future update guessing.

## Core Objects

### Original Intent

The user's initial request or choices before defaults are applied.

Examples:

- "single package React app with Jotai, Knip, linting, and AI harness"
- "workspace with one React app and one Effect package"
- a preset name plus overrides

Original intent is kept in the manifest so update can re-resolve the same user
goal under newer pins and provider artifacts.

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

Update compares the previous resolved graph to the next resolved graph. It does
not infer intent from the file tree.

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
- provider adapter calls `effect-harness init` and records provider surfaces

One materializer owns the final write for a physical file or managed block.

### Operation

An operation is the explicit side effect that the apply step may execute.

Initial operation types:

- `renderTemplate`
- `writeStructuredField`
- `writeManagedBlock`
- `writeManagedFile`
- `writeGeneratedUserFile`
- `callProvider`
- `runCommand`

Operations must declare:

- target path or provider target
- owning capability or provider
- surface kind
- create/update behavior
- verification or snapshot rule

### Surface Snapshot

A snapshot is the manifest record used for drift detection.

Snapshot forms:

- whole-file hash for managed files
- block hash for managed blocks
- structured value or hash for JSON/YAML/TOML pointers
- provider-reported digest for provider-owned surfaces

### Manifest

The manifest is the root ledger written after successful generation or update.

Expected generated path:

```text
.prelude/manifest.json
```

It should include:

- `schemaVersion`
- `preludeVersion`
- `originalIntent`
- `resolvedGraph`
- `pins`
- `providers`
- `managedSurfaces`
- `generatedUserSurfaces`

The manifest is not the source used to write initial files. It is the durable
state used to verify ownership and make future update deterministic.

## Create Flow

```text
input
  -> parse original intent
  -> resolve topology and capability graph
  -> resolve pins and providers
  -> collect contributions
  -> merge logical surfaces
  -> preflight conflicts
  -> build operations
  -> apply operations
  -> run verification
  -> snapshot managed surfaces
  -> write .prelude/manifest.json
```

The manifest is written last. A failed create should not claim a managed project
state that was not actually produced and verified.

## Update Flow

```text
read .prelude/manifest.json
  -> validate manifest schema
  -> check current managed surfaces against stored snapshots
  -> block on core managed drift
  -> re-resolve original intent with current prelude and pins
  -> compare previous resolved graph to next resolved graph
  -> build update operations for declared managed surfaces only
  -> dry-run or apply operations
  -> run verification
  -> snapshot updated managed surfaces
  -> write updated manifest
```

Update must block when:

- the manifest schema version is unsupported
- a provider contract schema version is unsupported
- a core managed surface was manually changed
- the next graph requires changing a generated-user surface
- a capability conflict has no deterministic rule
- major version drift requires redesign instead of ordinary update

Repair is a separate flow. Starting a repair agent requires user approval, and
applying its file changes requires separate approval.

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

For provider surfaces:

- provider owns its internals
- `prelude` records provider artifact, contract version, declared surfaces, and
  provider status
- `prelude` does not patch provider-owned runtime files directly

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

Manifest snapshot:

```json
{
  "path": "package.json",
  "kind": "structured-field",
  "owner": "package-manifest",
  "pointers": {
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

On update, if `/dependencies/react` no longer matches the old manifest snapshot
before `prelude` applies the new pin, update blocks as core managed drift.

## Example: React App Shell

Wrong model:

```text
React renderer patches src/App.tsx
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

The React app shell materializer renders `src/App.tsx` once.

However, the safer default is still to treat demo source files as
generated-user surfaces after create. Update should only keep managing app shell
files when there is an explicit managed shell contract and stable slots. Without
that contract, source files should not be touched after initial generation.

## Provider Harnesses

`prelude` selects and orchestrates harness providers. Providers own harness
semantics.

For `effect-harness`, the first useful adapter can be narrow:

```text
init(target, resolvedGraph)
status(target)
verify(target)
update(target, fromProviderVersion, toProviderVersion)
surfaceReport(target)
```

`prelude` owns:

- selecting the provider
- recording provider artifact and contract version
- checking provider freshness
- invoking provider lifecycle commands
- integrating provider status into overall verification

The provider owns:

- Effect source pin
- Effect package baseline
- runtime files
- agent routes
- guardrails
- provider-owned update policy
- provider-owned surface snapshots or digests

Do not extract a shared `harness-core` module until at least two provider
adapters prove the common interface. One adapter is a hypothetical seam.
