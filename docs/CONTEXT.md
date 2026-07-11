---
audience: [agent, human]
purpose: Define Prelude's active domain language.
status: active
updated: 2026-07-12
---

# Domain Context

## North-Star Sentence

Prelude converges one pnpm target toward the combined current intent of
multiple independently versioned Harness Artifacts, after showing and receiving
approval for one complete plan.

## Core Terms

### Target

The repository whose Harness Integrations are planned, applied, and checked.
Partita is the V1 acceptance Target.

### Control Root

The repository root containing `prelude.config.jsonc`, root `package.json`, and
`pnpm-lock.yaml`. It is the only V1 importer for Prelude and Harness Modules.

### Harness

An independently evolving body of domain capability, policy, documentation,
and verification. Effect Harness and Psychogram are Harnesses. Their content is
not Prelude content.

### Harness Artifact

The exact installed package selected by the Target's root package graph and
lockfile. It contains the Harness Module and any static target bundle it plans.

### Harness Module

The read-only executable adapter exported by a Harness Artifact. It implements
`@sayoriqwq/prelude-contract`, observes the Target through the host boundary,
and returns current Outputs, Requirements, Checks, and Issues. It never mutates
the Target.

### Harness Integration

One configured use of a Harness Module at one target `packageRoot`. Its stable
`integrationId` owns every declaration it returns. Multiple Harnesses and
multiple Integrations of one Module are ordinary.

### Harness Identity

A stable `harnessId` declared by the Module. It is independent from npm package
name and from `integrationId`. Prelude records it but does not branch on it.

### Contract

The Effect Schema-backed, published package
`@sayoriqwq/prelude-contract`. It defines plain JSON-compatible Module and Plan
data. It contains no target mutation or Harness domain policy.

### Output

A current declaration of Harness authority. V1 has four Output capabilities:

- `ManagedTree`: exact byte-for-byte authority over one complete target tree;
- `ManagedBlock`: authority over one bounded block in a shared text file;
- `JsonValue`: authority over one JSON/JSONC logical pointer;
- `JsonKeyedItem`: authority over one stable-key item in a JSON/JSONC collection.

Everything outside active Output authority is target-owned by default.

### Requirement

A direct package prerequisite at an exact target importer and manifest section.
It blocks until the direct declaration, lockfile resolution, and installation
state satisfy the requested range.

### Issue

A current Module-diagnosed blocker. V1 has no warning severity or persisted
issue lifecycle. A resolved Issue simply disappears from the next plan.

### Check

An independent post-convergence target command. Prelude composes Checks from all
Integrations and the Target runs them through `prelude check`.

### Plan Document

The versioned machine-readable result of loading every Integration, composing
all declarations, comparing current with desired state, and calculating the
exact execution hash. Human rendering is a view of this document.

### Execution Hash

The approval boundary for one exact plan. Apply replans under the write lock and
refuses to write unless the current execution hash equals the approved hash.

### Prelude-Owned Skill

A user-authorized soft boundary for operations too semantic for deterministic
core: bootstrap package/config state, patch target-owned executable config, and
assist upgrades or residue cleanup. Skills may propose broad edits but cannot
approve a Plan on the user's behalf.

### Target-Owned Content

All content outside active Output locators. Examples include
`effect/feedback/**`, real Psychogram wikis under `psychogram/wikis/**`, and the
root executable ESLint composition file.

### Source Diagnostics

An optional Harness-specific escalation path for exceptional diagnosis. Normal
Target operation uses the complete projected Harness bundle and does not clone
or inspect upstream source repositories.

## Implementation Language

Effect v4 is Prelude's implementation substrate, not a Harness domain term.
Effect-native services, schemas, scopes, failures, and platform adapters shape
the runtime. Observable convergence behavior remains the specification; exact
helper names and old code layout do not.

## Retired Language

Do not use these as active Prelude concepts:

- create, genesis, scaffold, preset, recipe, or `CreateSpec`;
- provider or provider discovery;
- maintain as a separate lifecycle;
- manifest, receipt, base snapshot, or applied state;
- drift as a three-way historical comparison;
- projection as a Prelude abstraction (`projection` remains valid inside the
  Psychogram domain);
- managed file or Owned File as a V1 Output.
