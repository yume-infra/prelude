---
audience: [agent, human]
purpose: Define Prelude's active domain language.
status: active
updated: 2026-07-13
---

# Domain Context

## North-Star Sentence

Prelude converges one pnpm target toward the combined current intent of
multiple independently versioned Harness Artifacts, after showing and receiving
approval for one complete plan.

## Core Terms

### Target

The repository whose Harness Integrations are planned, applied, and checked.
Isolated single-package and pnpm-workspace Targets are the V2 Gate 1 acceptance
Targets. Partita remains a later real cross-Harness migration target.

### Control Root

The nearest ancestor containing `.prelude/config.jsonc`. Its root
`package.json` and `pnpm-lock.yaml` select exact Prelude and Harness Artifacts.

### Prelude Configuration

The sole committed Integration configuration at `.prelude/config.jsonc`. V2
accepts only `schemaVersion: 2` and contains no Harness options or applied
state.

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

One configured use of a Harness Module over a nonempty explicit collection of
approved `packageRoots`. Its stable `integrationId` owns every declaration it
returns and one encoded Integration Workspace. Multiple Harnesses and multiple
Integrations of one Module are ordinary.

### Integration Workspace

The committed `.prelude/<encoded-integration-id>/` namespace for one
Integration. `managed/` and `repos/` are converged Output zones. `feedback/` is
neighboring Target-owned evidence and is never an Output.

### Package Root

One Target package importer explicitly authorized to an Integration by its
committed `packageRoots`. Prelude does not discover or claim new packages.

### Harness Identity

A stable `harnessId` declared by the Module. It is independent from npm package
name and from `integrationId`. Prelude records it but does not branch on it.

### Contract

The Effect Schema-backed, published package
`@sayoriqwq/prelude-contract`. It defines plain JSON-compatible Module and Plan
data. It contains no target mutation or Harness domain policy.

### Source Pin And Publication

A Source Pin is a producer-maintained, Git-index-authoritative snapshot of one
outer repository layer. A publication is the deterministic canonical tree
archive plus provenance JSON derived from one verified Source Pin. Prelude
Contract owns their shared archive and digest protocol; Partita is the generic
producer; a Harness composes concrete publication identity and Target policy;
Prelude consumes the declaration without becoming a Git or Source Pin owner.

### Output

A current declaration of Harness authority. V2 has five Output capabilities:

- `ManagedTree`: exact byte-for-byte authority over one complete target tree;
- `ManagedBlock`: authority over one bounded block in a shared text file;
- `JsonValue`: authority over one JSON/JSONC logical pointer;
- `JsonKeyedItem`: authority over one stable-key item in a JSON/JSONC collection.
- `PinnedReferenceTree`: complete immutable-provenance, reference-only
  Harness authority over one Integration Workspace tree.

Everything outside active Output authority is target-owned by default.

### Output Locator Root

The explicit semantic base of every Output: Control Root, the declaring
Integration Workspace, or one approved Package Root. Prelude resolves these to
physical Control-Root-relative paths before conflict and feedback-zone checks.

### Requirement

A direct package prerequisite at an approved Package Root and manifest section.
Missing or incompatible manifest/lock selection blocks for an exact-diff repair.
A compatible Approved Package Selection may be installed only through a frozen
install after its manifest and lockfile bytes enter the Plan hash.

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
core: bootstrap package/config state, coordinate cross-Harness upgrades, drive
Plan/apply/check, and assist residue cleanup. Skills may propose broad edits but
cannot approve a Plan on the user's behalf.

### Harness-Delivered Skill

A versioned domain skill delivered inside one Harness's managed bundle. After
Control Handoff it may adapt Target-owned package, TypeScript, executable
configuration, editor, verification, or feedback state, but only after explicit
authorization. Its Observe, Propose, and Authorize phases are non-mutating.

### Control Handoff

The phase boundary after Prelude delivers stable Harness-owned Outputs and
before a Harness-delivered skill makes authorized domain-specific Target
Adaptation. Prelude-owned orchestration routes to the skill without reproducing
Harness policy; the delivered skill returns control after recording and
verifying the approved Target-owned result.

### Target-Owned Content

All content outside active Output locators. Examples include Integration
`feedback/**`, real Psychogram content, and Target-authored executable config.

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
