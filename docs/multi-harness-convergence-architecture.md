---
audience: [agent, human]
purpose: Define the accepted Prelude V1 system architecture.
status: active
updated: 2026-07-15
---

# Multi-Harness Convergence Architecture

## V2 Successor Note

This document preserves the released V1 architecture. The active V2 changes to
Control Root discovery, committed Integration Workspaces, selected Package
Roots, tagged locators, and pinned reference materialization are authoritative
in [`v2-harness-convergence-contract.md`](./v2-harness-convergence-contract.md).

## End State

Prelude is a domain-blind host that turns several independently versioned
Harness Module plans into one reviewable Target transition.

```text
Target control root
  package.json + pnpm-lock.yaml + prelude.config.jsonc
       |
       v
exact root-selected Prelude and Harness Artifacts
       |
       v
read-only Harness Module plans
       |
       v
global Output, Requirement, Issue, and Check composition
       |
       v
versioned Plan Document + execution hash
       |
       v
explicit approval -> apply -> prelude check
```

Initial Integration and later Artifact upgrades use the same current-to-desired
lifecycle. Selected Artifacts and committed config are complete desired truth.
There is no committed applied state.

## Ownership Boundaries

### Target

The Target owns:

- root package and lockfile selection;
- `prelude.config.jsonc`;
- approval of exact plans;
- ordinary content outside active Output locators;
- execution of `prelude check` in local and CI environments.

### Harness Artifact

Each Harness Artifact owns:

- Harness domain policy and documentation;
- one or more exact ESM Module exports;
- static source trees intended for Target projection;
- package Requirements and target verification intent;
- diagnosis and optional guidance for unsupported Target state.

The Artifact does not mutate the Target during planning.

### Shared Contract

`@sayoriqwq/prelude-contract` owns Effect Schema codecs and types for the Module
boundary and Plan data. It has no filesystem access, loader, planner,
materializer, CLI, or Harness domain policy.

### Prelude Core

Prelude owns:

- committed config decoding;
- exact root package export resolution;
- read-only Module execution;
- global composition and conflict detection;
- current-to-desired comparison;
- Plan Document and execution hash production;
- approved Output materialization;
- composed Check execution.

Prelude never branches on Effect or Psychogram identity.

### Prelude-Owned Skills

User-authorized skills form the semantic boundary outside deterministic core.
They may bootstrap package/config state, patch target-owned executable config,
and assist upgrades or residue cleanup. Harnesses may ship guidance, but they do
not own competing integration mutators.

For the V2 Effect Integration, ADR-0018 supersedes that exclusive V1 assignment:
Prelude-owned skills retain orchestration, while the delivered Effect skill
owns explicitly authorized domain-specific Target Adaptation after Control
Handoff. Prelude core remains the only writer of active Outputs.

## Artifact Selection

The directory containing `prelude.config.jsonc` is the Control Root. Prelude and
all Harness packages are direct root `devDependencies`. The root lockfile and
installed graph select exact executable Artifacts.

Integration config names an exact bare package export such as
`@sayoriqwq/effect-harness/prelude`. Prelude loads the fixed named export
`harnessModule`. There is no discovery, package metadata convention, nested
importer, path-based Module, registry lookup, or old provider fallback.

An Integration's `packageRoot` identifies where its Target-relative declarations
apply. It does not alter Module resolution.

## Read-Only Planning

Prelude gives each Module:

- its Integration identity and target package root;
- host-observed Artifact identity and an Artifact-relative asset boundary;
- read-only Target observation services;
- the contract protocol supported by the host.

The Module returns one complete current plan containing Outputs, Requirements,
Checks, and Issues. Expected target mismatch is represented as an Issue or a
planned change. Module load failure, schema violation, path escape, or an
unhandled Effect failure is a planning failure, not an Issue to be ignored.

## Output Authority

V1 supports exactly four Output capabilities.

### Managed Tree

A Module names a static Artifact-relative source directory and an exclusive
Target-relative root. Desired state is the complete source tree byte-for-byte.
Prelude stages and replaces the directory as a unit. File additions, changes,
renames, and deletions inside the tree are display evidence, not separate
contract operations.

### Managed Block

A Module owns one stable bounded block inside a shared text file. Prelude owns
marker parsing and updates only that block. Multiple Integrations may share the
file when their blocks are distinct and nonoverlapping.

### JSON Value

A Module owns one logical pointer in a JSON or JSONC file. Prelude owns parsing,
duplicate-key rejection, semantic comparison, comment-preserving editing, and
physical publication. Unclaimed values remain unchanged.

### JSON Keyed Item

A Module owns one item in a JSON or JSONC collection through a stable key such
as a language-service plugin `name`. Prelude compares and replaces that exact
item without relying on array position. Other keyed items remain unchanged.

An omitted bounded Output means that the current Module makes no request. It
does not authorize deletion. Only Managed Tree replacement has exact deletion
semantics within its root. Upgrade residue outside a current tree is handled by
an authorized reconciliation skill.

## Target-Owned Content

Everything outside active Output locators is target-owned. Prelude does not
need an `ExtensionSurface` declaration to preserve it.

Examples:

- Effect owns `effect/managed/**`; `effect/feedback/**` is target-owned.
- Psychogram owns `psychogram/managed/**`; real wiki content under
  `psychogram/wikis/**` is target-owned.
- `eslint.config.mjs` is a target-owned executable composition entry point.

Harness-managed documents may link to target-owned content. Prelude does not
interpret or synchronize that content.

## Global Composition

Prelude plans every Integration before any write and rejects at least:

- duplicate Integration ids or declaration ids;
- overlapping or nested Managed Tree roots;
- a tree claim overlapping any bounded claim;
- duplicate or overlapping Managed Blocks;
- equal or ancestor/descendant JSON pointers;
- duplicate JSON keyed collection identities;
- incompatible package Requirements at one importer;
- any normalized path escape, symlink escape, or unsupported special file.

No winner is selected by config order. A conflict blocks the complete plan.

## Executable Configuration

Prelude Core does not parse or rewrite JavaScript or TypeScript config. A
Harness exports a stable composable npm API, for example an ESLint flat-config
fragment. Its Module diagnoses whether the Target has integrated that API and
returns a blocking Issue when it has not.

A Prelude-owned skill may inspect and patch the target-owned executable entry
point after user authorization, show the concrete diff, and re-enter planning.
Normal Artifact upgrades then flow through the stable imported API. V1 has no
Owned File Output or executable AST materializer.

## Plan And Approval

`prelude plan --json` emits a versioned public Plan Document containing selected
Artifact identities, Integration plans, current comparisons, conflicts,
Requirements, Issues, Checks, human evidence, and an execution hash.

Approval binds one exact execution hash. Apply acquires the Target write
boundary, replans from current files and selected Artifacts, and writes only if
the recomputed hash still matches. Human rendering may change without changing
the machine schema or execution semantics.

## Apply And Recovery

Prelude publishes bounded JSON/text changes through staged single-file writes.
Managed Trees are fully staged and checked before replacement. V1 promises
rerunnable, detectable partial application, not crash-atomic whole-plan
rollback.

If apply fails after some Outputs were published, Prelude reports failure. The
next plan observes completed Outputs as no-ops and remaining Outputs as pending;
the user approves and reruns. There is no receipt, rollback journal, previous
base, or `.prelude/` directory.

Runtime locks and snapshots use temporary storage. Tree staging uses temporary
siblings so publication stays on the Target filesystem. Effect scopes clean
resources while the process lives; process death remains outside durable
transaction guarantees.

## Requirements, Issues, And Checks

Package Requirements are direct root or workspace-importer prerequisites.
Missing or incompatible state blocks. Prelude Core does not run pnpm to repair
them; an authorized skill or human updates package and lock state, then replans.

Every Issue blocks apply. Nonblocking observations are Plan evidence rather than
a severity tier.

Checks are independent post-convergence target commands. `prelude check` first
replans and proves Outputs, Requirements, and Issues are clean, executes the
composed commands, and replans again to detect managed-surface mutation.
Verification failure does not roll back a completed apply.

## Effect V4 Runtime

Prelude is rewritten around Effect v4 and `@effect/platform`. Effect Schema is
the canonical config and Contract codec. Effect services and Layers establish
runtime boundaries; typed failures replace exception-shaped business control;
scopes own temporary resources; platform services own filesystem and process
effects. This implementation constraint must deepen the modules rather than
wrap the old create/provider call graph.

## V1 Proof And Deferred Product Work

Effect Harness and Psychogram must run together in Partita before V1 is
complete. Fake Modules may test conflicts but cannot replace this tracer.

V1 deliberately defers project creation, TUI, Integration removal, multi-wiki
semantics, arbitrary Harness options, third-party sandboxing, automatic package
mutation, and stronger durable transactions. Those features may be designed
later from this contract without preserving their historical Prelude forms.
