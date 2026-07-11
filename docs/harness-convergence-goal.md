---
audience: [agent, human]
purpose: State Prelude's first-principles goal and V1 success condition.
status: active
updated: 2026-07-12
---

# Harness Convergence Goal

## First-Principles Goal

A Target can depend on several versioned Harnesses, inspect the complete effect
of their current combined intent, approve that exact effect, materialize it, and
verify the resulting repository. Upgrading a Harness package produces a new
inspectable desired state instead of requiring the Target to rediscover or
manually copy Harness infrastructure.

Prelude exists because package managers select and version executable
Artifacts but cannot by themselves compose and safely materialize repository
surfaces across multiple Harnesses.

## User Outcome

For Partita, the real workflow is:

1. Root package state selects Prelude, Effect Harness, and Psychogram.
2. Static config selects one Integration of each Harness.
3. Prelude loads both Modules and plans without writing.
4. One plan shows every tree, shared-file block, structured value, package
   blocker, issue, and target check.
5. Conflicts or missing prerequisites block before apply.
6. The user approves one exact execution hash.
7. Prelude applies Harness-owned surfaces.
8. Partita executes the composed checks.
9. A later package update repeats the same lifecycle from current state.

The user always knows what will change and which Harness Integration owns it.

## V1 Contract Promise

V1 freezes the semantics needed by both real Harnesses:

- stable Harness and Integration identity;
- exact root Artifact selection;
- read-only target-aware Module planning;
- four composable Output capabilities;
- direct package Requirements;
- all-or-block Issues;
- independent target command Checks;
- global conflict detection;
- a versioned Plan Document and execution hash;
- current-to-desired apply without committed state;
- additive feature negotiation for later capabilities.

The implementation may be small. The contract seam cannot be Effect-specific,
Psychogram-specific, or tied to the current npm package names.

## V1 Acceptance Target

V1 is not accepted through fake Modules alone or through one real Harness at a
time. `/Users/sayori/Desktop/yume-infra/partita` must simultaneously prove:

- real packed or published Effect Harness and Psychogram Artifacts;
- two Artifact-managed static trees;
- two disjoint managed blocks in root `AGENTS.md`;
- Effect-required tsconfig/editor structured values;
- package Requirement blocking and authorized repair;
- target-owned Effect feedback content;
- one real target-owned Psychogram wiki under `psychogram/wikis/**`;
- one combined Plan, approved apply, and composed check;
- no sibling source-repository paths or legacy provider compatibility.

## Runtime Constraint

Prelude V1 is an Effect v4 rewrite. Production orchestration uses Effect and
`@effect/platform`; shared and committed schemas use Effect Schema. The design
is judged by the final Partita behavior, not by preserving existing interfaces
or wrapping imperative create/provider code in `Effect.try`.

## Non-Goals

V1 does not provide:

- project creation or scaffolding;
- compatibility with old Prelude projects or providers;
- a TUI;
- automatic package installation in core;
- automatic executable-code merging in core;
- Integration removal guarantees;
- durable receipts, rollback journals, or historical bases;
- semantic modeling of target-owned feedback or wiki content;
- multi-wiki Psychogram semantics;
- arbitrary third-party plugin sandboxing;
- non-pnpm or non-TypeScript/JavaScript target support.

Missing old features may be redesigned later from this baseline. Their old code
and issue descriptions are not migration requirements.

## Completion Definition

V1 is complete when:

- active docs and CLI expose only the convergence product;
- old create/provider/TUI/state code and tests are deleted;
- the shared Contract package is published and consumed by all three repos;
- Prelude is Effect v4-native and contains no Harness domain branches;
- Effect Harness and Psychogram return valid real plans;
- Partita passes the complete plan/apply/check tracer;
- repository verification and packed-artifact acceptance pass;
- no `.prelude/` directory or compatibility residue is created.
