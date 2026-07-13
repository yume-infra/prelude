---
audience: [agent, human]
purpose: Define the behavioral contract between Prelude and Harness Modules.
status: active
updated: 2026-07-12
---

# Harness Module Contract

## V2 Successor Note

The sections below preserve the released V1 contract rationale. The active V2
wire and host behavior is defined by
[`v2-harness-convergence-contract.md`](./v2-harness-convergence-contract.md):
explicit tagged locators, selected `packageRoots`, rooted observations, and
`PinnedReferenceTree` supersede conflicting V1 shapes. Prelude does not adapt
the V1 wire.

## Published Boundary

The contract is published from this repository as
`@sayoriqwq/prelude-contract`. Prelude, Effect Harness, and Psychogram all
depend on it. The package uses Effect Schema as its canonical runtime codec and
derives TypeScript types from those schemas.

Wire values are plain JSON-compatible data. The boundary does not rely on
classes, `instanceof`, global registries, or one physical npm package instance.
The npm package version transports contract code; explicit protocol and feature
fields decide host compatibility.

## Module Export

Integration config names an exact package export. That ESM entry point exposes
one named `harnessModule` value. Conceptually, a Module contains:

```text
descriptor
  stable harness identity
  protocol version
  required host features

plan(context)
  Effect that reads through the host boundary
  and returns one complete Module Plan
```

Exact TypeScript helper names are implementation details. Observable behavior
and Effect Schema conformance are authoritative.

## Planning Context

The host supplies:

- `integrationId` from committed config;
- exact target `packageRoot`;
- host-observed opaque Artifact resolution identity;
- a confined Artifact asset view;
- read-only Target filesystem and package observations;
- supported protocol and feature information.

V1 config has no Harness options. A Module may inspect the Target but may not
write files, run repair commands, update packages, or mutate process-global
state as part of planning.

## Module Plan

A successful plan has four complete current categories:

```text
outputs
requirements
checks
issues
```

All declaration ids are stable and unique within one Integration. Prelude
derives global ownership from `(integrationId, declarationId)`.

An expected unsupported Target condition is a blocking Issue. Invalid contract
data, unsafe paths, an inaccessible Artifact, or an unexpected Module Effect
failure fails planning itself.

## Output Union

V1 contains only the following Output capabilities.

### ManagedTree

Required semantics:

- stable Output id;
- Artifact-relative static source directory;
- normalized Target-relative root;
- complete byte-for-byte authority below that root.

Prelude validates that source assets remain inside the selected Artifact and
that target paths remain inside the Target. Symlinks, hardlinks, special files,
or path escapes block V1 planning.

Current target differences are a planned tree replacement, not a drift conflict.
File-level diffs are evidence only.

### ManagedBlock

Required semantics:

- stable Output id;
- normalized Target-relative text-file path;
- stable block identity;
- exact desired block content.

Prelude owns marker format, parsing, newline normalization policy, duplicate
marker rejection, overlap detection, and comment-preserving surrounding-file
publication. A Module never supplies ad hoc string patch instructions.

### JsonValue

Required semantics:

- stable Output id;
- normalized Target-relative JSON/JSONC path;
- canonical logical pointer;
- JSON-compatible desired value.

Prelude owns structured parsing, duplicate-key rejection, semantic equality,
format preservation, conflict detection, and publication. Package dependency
fields are Requirements rather than JsonValue Outputs.

### JsonKeyedItem

Required semantics:

- stable Output id;
- normalized Target-relative JSON/JSONC path;
- canonical collection pointer;
- host-supported stable key field and key value;
- complete desired collection item.

Prelude owns lookup, duplicate-key rejection, deterministic insertion, semantic
replacement, and conflict detection. Array indexes and arbitrary comparator
callbacks are not contract locators.

## Omission And Deletion

For ManagedBlock, JsonValue, and JsonKeyedItem, omission means no current
request. It does not delete a prior value. V1 deliberately has no `absent`,
retirement, handoff, or previous-owner state.

ManagedTree is different: while declared, its target root exactly mirrors the
current Artifact source tree, including deletions inside that root.

## Package Requirement

A Requirement identifies:

- exact target importer/package root;
- package name;
- compatible version range;
- direct manifest section, limited in V1 to `dependencies` or
  `devDependencies`.

Satisfaction requires a direct declaration in that section, a lockfile
resolution for that importer satisfying the range, and installed state
consistent with the lockfile. A transitive dependency does not satisfy it.
Catalog, workspace, patch, and other pnpm selectors are accepted through their
resolved lockfile identity.

Requirements are blockers and never package write authority.

## Issue

Every V1 Issue blocks apply and check. It carries an Integration-scoped stable
id, human summary, and optional detail, Target evidence, and Artifact-relative
guidance. There is no severity, persisted status, assignment, or lifecycle.

After repair, the next plan simply stops returning the Issue.

## Target Check

A Check carries:

- Integration-scoped stable id;
- human summary;
- exact target package root;
- nonempty argv.

Prelude executes argv directly with that package root as cwd. There is no shell,
environment override, retry policy, alternate success code, callback,
dependency graph, or ordering hint. Exit code zero succeeds.

Checks are independent. Prelude orders them canonically, runs them serially,
continues after individual failures, and reports the complete failure set.

## Global Validation

Prelude rejects declaration conflicts across all Integrations before writing.
At minimum it detects overlapping tree roots, tree/bounded-locator overlap,
overlapping blocks, JSON pointer ancestor/descendant overlap, duplicate keyed
items, incompatible Requirements, duplicate ids, and unsafe paths.

Integration order never grants precedence.

## Protocol Evolution

V1 field and capability semantics do not change after publication. Later hosts
may add optional fields or new capabilities. A Module declares required
features; an older Prelude blocks before partial planning when it does not
support them.

`prelude plan --json` has its own schema version and execution-hash version.
Contract package semver, Module protocol, Plan schema, and execution hash are
related but distinct compatibility axes.

## Contract Conformance

The shared package must provide reusable conformance fixtures for:

- Effect Schema decoding and encoding;
- plain-data round trips across duplicate installed package copies;
- stable ids and path normalization;
- each V1 Output capability;
- Requirements, Issues, and Checks;
- unsupported required features;
- malformed and unsafe Module plans.

Effect Harness and Psychogram must consume the published package rather than
copying its declarations.
