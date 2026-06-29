---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 定义 create materialization 如何从 CreateSpec 生成文件，并说明 create 不拥有 maintain manifest。
status: active
sources:
  - docs/create-maintain-architecture.md
updated: 2026-06-29
---

# Create Materialization Architecture

## Boundary

This module defines create materialization and its association with maintain initialization.

The maintain manifest is defined by
[`maintain-architecture.md`](./maintain-architecture.md).

## Core Rule

Capabilities do not write shared files directly.

Capabilities contribute to create surfaces.

One create surface has one materializer.

One physical path has one writer.

Ordinary scaffold is handed off after create verification.

Create materialization MUST NOT create long-term update authority for ordinary scaffold.

## Create Flow

```text
CreateSpec
  -> create resolver
  -> resolved create graph
  -> capability modules
  -> create contributions
  -> create surfaces
  -> materializers
  -> create WritePlan
  -> path ownership preflight
  -> apply files
  -> create verification
  -> handoff
```

The create WritePlan is the only side-effect plan for create.

The create WritePlan MAY include an explicit `initializeMaintain` operation when maintain is selected.

`initializeMaintain` delegates managed writes to maintain initialization.

Create materialization MUST NOT write managed files or managed blocks directly.

## CreateSpec

`CreateSpec` records confirmed create intent.

`CreateSpec` MAY be produced by guided CLI, direct spec, or CreateSpec recipe.

`CreateSpec` MUST enter the create resolver before files are written.

`CreateSpec` MUST NOT bypass capability modules or create surfaces.

## Resolved Create Graph

The resolved create graph is create-time execution data.

The resolved create graph MAY include topology, packages, selected capabilities, selected maintain behavior, pins, and selected create surfaces.

The resolved create graph MUST NOT become maintain desired truth.

Maintain domains MAY receive a narrow projection during maintain initialization when that projection is required for managed behavior.

## Capability Contribution

A capability contribution is a typed request against a create surface.

Capability contributions are not file writes.

Capability contributions SHOULD stay close to capability modules.

Capability contributions MAY request complete local generated files when one capability owns the output.

Capability contributions SHOULD use typed create surfaces when multiple capabilities affect the same semantic resource.

## Create Surface

A create surface is a semantic merge point.

Examples:

- `package-manifest:root`
- `package-manifest:packages/web`
- `workspace-manifest:root`
- `react-app-shell:packages/web`
- `vite-config:packages/web`
- `stylesheet:packages/web/src/styles.css`

Create surfaces SHOULD be deep enough to own merge policy, conflict diagnostics, operation emission, and create verification expectations.

Create surfaces MUST block incompatible contributions before writes.

Create surfaces MUST NOT rely on last-writer-wins.

## Materializer

A materializer turns one create surface into write operations.

A materializer MAY use:

- complete local templates
- local source emitters
- small explicit variables
- local helper functions

A materializer MUST NOT use:

- global template rendering
- cross-capability template inheritance
- cross-capability textual includes
- hidden capability-list conditionals inside shared templates

Template duplication is allowed when it preserves open/closed extension and locality.

## Operations

Create operations are explicit side effects.

Initial operation kinds MAY include:

- `writeStructuredFile`
- `writeGeneratedUserFile`
- `writeExecutableFile`
- `initializeMaintain`
- `runCommand`

Operation execution is intentionally shallow.

The depth belongs in capability modules and create surfaces.

## Path Ownership

Physical path conflicts MUST be detected before writes.

Two independent operations MUST NOT write the same physical path.

Shared semantic resources MUST be represented by one create surface.

Identical output text MUST NOT imply shared ownership.

## Create Verification

Create verification proves the generated project is usable at creation time.

Create verification SHOULD be derived from capability or surface expectations.

Create verification SHOULD NOT be a central switch over runtime family names.

Generated smoke remains an external gate.

Generated smoke MAY assert exact generated behavior for representative targets.

Generated smoke MUST NOT become the only acceptance authority.

## Maintain Initialization

Create may initialize maintain.

Maintain initialization is the only association between create and maintain.

Maintain initialization SHOULD write initial managed surfaces and create the initial maintain manifest.

Maintain initialization MUST transfer only managed intent.

Maintain initialization MUST NOT transfer ordinary scaffold ownership.

Maintain initialization MUST NOT record ordinary scaffold provenance.

Maintain initialization MUST NOT give maintain the full resolved create graph as update authority.

## Handoff

Ordinary scaffold enters handoff after create verification.

Handoff means `prelude` does not maintain that output.

Handoff files MAY still be generated through typed create surfaces.

Typed create composition does not imply maintain lifecycle.

## Example

```text
react-app capability
  -> package-manifest dependencies.react
  -> package-manifest scripts.dev
  -> react-app-shell base slots

state:jotai capability
  -> package-manifest dependencies.jotai
  -> react-app-shell state slots

css:tailwind capability
  -> package-manifest devDependencies.tailwindcss
  -> vite-config plugin slot
  -> stylesheet source
```

Only the package manifest materializer writes `package.json`.

Only the React app shell materializer writes `src/App.tsx`.

After create verification, those ordinary app files are handed off unless maintain initialization explicitly claimed a managed surface.
