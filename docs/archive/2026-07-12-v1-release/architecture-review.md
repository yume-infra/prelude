---
audience: [agent, human]
purpose: Record the architecture pressure test and final V1 reductions.
status: active
updated: 2026-07-12
---

# Architecture Review

## Review Question

Can Prelude V1 make two real evolving Harnesses useful in Partita without first
building a large generic lifecycle platform?

## Finding

Yes, after reducing the design to one shared Contract, four authority
capabilities, stateless current-to-desired planning, exact approval, and one real
two-Harness tracer.

The previous design was platform-first. It attempted to solve future ownership
transition, receipt, extension, recovery, option, plugin, and UI cases before
Effect Harness and Psychogram could run together. Those abstractions increased
implementation and semantic risk without improving the first real outcome.

## Retained Core

The following are not overdesign; removing them would force an architectural
rewrite after V1:

- independently versioned Harness Artifacts selected by the Target lockfile;
- a separately published shared Contract dependency;
- stable Harness identity distinct from Integration and package identity;
- multiple Harnesses from day one;
- read-only target-aware Module planning;
- global composition before writes;
- exact Managed Tree authority plus bounded shared locators;
- direct package Requirements and blocking Issues;
- target-executed composed Checks;
- versioned Plan JSON and exact execution-hash approval;
- additive required-feature negotiation;
- Prelude-owned semantic skills outside deterministic core;
- domain-blind Prelude behavior.

These are the minimum seams that let another Harness join later without
changing what Prelude is.

## Removed From V1

The pressure test removed:

- create, scaffold, preset, recipe, and TUI product lines;
- provider discovery and compatibility;
- `.prelude/`, manifests, receipts, bases, inventories, and journals;
- three-way drift and managed handoff state;
- Owned File;
- Extension Surface;
- Manual Action;
- per-file tree mutation operations;
- absent/retirement semantics for bounded Outputs;
- Harness config options;
- executable config parsing or AST merge;
- automatic package mutation in core;
- rollback promises beyond rerunnable partial application;
- Prelude modeling of Effect feedback or Psychogram wiki content;
- multi-wiki support;
- arbitrary plugin sandboxing and platform breadth;
- a release sequence that accepts one real Harness before the second.

## Why The Shared Package Matters

Earlier cross-repository attempts relied on documentation and copied shapes.
That allowed Prelude and Effect Harness to evolve compatible-looking but
different contracts. A real npm dependency converts that mismatch into compile,
schema, and protocol failures at the boundary where it belongs.

The package must remain small and plain-data oriented. It is not a shared
business-logic package and not a backdoor dependency from Harnesses to Prelude
Core.

## Why Effect V4 Is An Implementation Constraint

The rewritten host is orchestration-heavy: package and file observation,
several Module executions, typed blockers, scoped staging, process commands,
interruption, and deterministic tests. Effect v4 and `@effect/platform` already
provide the runtime vocabulary needed for those boundaries.

The risk is superficial adoption: retaining the old call graph and wrapping
each Promise in an Effect. The implementation must instead form deep Effect
services around the new behavior. Effect remains infrastructure; no Effect
Harness policy enters Prelude.

## Executable Config Boundary

Dropping Owned File does not abandon ESLint integration. The durable policy
lives behind an importable Harness package API. The target-owned entry point is
patched once by an authorized Prelude skill, while the Module diagnoses whether
the effective policy is present.

This is simpler and safer than either whole-file replacement or a JavaScript AST
composition engine. It also makes routine Harness upgrades flow through normal
package versioning.

## Apply Safety Judgment

V1 does not need a custom filesystem transaction engine. It needs:

- complete planning before writes;
- exact hash revalidation under an exclusive write boundary;
- staged bounded files and complete trees;
- honest failure reporting;
- rerunnable current-to-desired comparison;
- no false success or durable applied-state claims.

Effect scopes improve live-process cleanup but do not survive power loss or
SIGKILL. The architecture states this limit instead of claiming crash atomicity.

## Remaining Risks

### Cross-Repository Release Coordination

Contract, Prelude, Effect Harness, and Psychogram changes must land in compatible
order. Mitigation: packed tarball acceptance before public publication and
changesets for every published boundary.

### Effect V4 API Movement

The selected Effect v4 line may still evolve. Mitigation: pin exact runtime
versions inside Prelude and keep platform-specific APIs behind deep services.

### Executable Config Diagnosis

The Harness must reliably detect whether its ESLint policy is active without
turning Prelude into a source parser. Mitigation: keep diagnosis in the Harness
and prove it against Partita's real config.

### Partial Tree Publication

Directory replacement is rerunnable but not promised crash-atomic. Mitigation:
stage fully, publish deterministically, inject failures, and verify the next plan
shows exact remaining work.

### Documentation Bundle Quality

Managed trees are only useful if the full projected Harness docs are sufficient
for target agents. Mitigation: byte-for-byte bundle assertions and agent reading
tests in Partita; Source Diagnostics remains an explicit exception path.

## Final Judgment

The architecture is now appropriately narrow. Its complexity is concentrated
in unavoidable multi-owner composition and approval semantics, while lifecycle
history, generic patching, platform breadth, and old product compatibility have
been removed. No further architecture grilling is required before beginning the
Effect v4 rewrite.
