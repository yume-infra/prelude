---
audience: [agent, human]
purpose: Define plan, approval, apply, check, bootstrap, and upgrade behavior.
status: active
updated: 2026-07-12
---

# Harness Integration Lifecycle

## One Stateless Lifecycle

Initial Integration and Artifact upgrade are the same operation:

```text
selected packages + config + current Target
  -> plan
  -> repair blockers if needed
  -> approve exact hash
  -> apply
  -> check
```

Prelude has no separate create or maintain lifecycle and keeps no committed
record of a previous apply.

## Prerequisites

Before core planning:

- the Control Root has `package.json`, `pnpm-lock.yaml`, and
  `prelude.config.jsonc`;
- Prelude and all Harness Artifacts are direct root `devDependencies`;
- installed package state matches the lockfile;
- config passes the Prelude Effect Schema;
- every configured package export resolves from the Control Root and exposes
  `harnessModule`.

A user-authorized Prelude skill may create or repair these inputs. Core has no
init or package-install command.

## Plan

Planning performs:

1. Decode committed config.
2. Observe root package and lock state.
3. Resolve exact Prelude and Harness Artifacts.
4. Load and validate every Module descriptor.
5. Run every Module through read-only Target and Artifact services.
6. Decode every returned Module Plan.
7. Compose all Outputs, Requirements, Issues, and Checks.
8. Reject conflicts and unsafe paths.
9. Compare each active Output with current Target state.
10. Produce the versioned Plan Document and execution hash.

Planning never writes. A blocked plan is still useful machine and human output;
it identifies missing Requirements, Module Issues, and composition conflicts.

## Blocker Repair

Prelude Core does not convert blockers into writes.

- Package blockers are repaired through pnpm by a human or authorized skill.
- Executable-config blockers are repaired by a Prelude-owned skill using
  Harness-provided guidance and an approved concrete diff.
- Harness/domain blockers are repaired in the Target or Harness as appropriate.
- Cross-Harness authority conflicts require changing Harness design or
  Integration selection.

After repair, Prelude replans from the real Target. There is no persisted issue
state to update.

## Approval

The Plan Document separates display evidence from execution semantics. Its
execution hash binds the exact selected Artifacts, declarations, observed
current state needed by those declarations, and materialization payload.

Apply must receive explicit approval for that exact hash. A package update,
generic confirmation flag, saved config, or old Plan does not authorize a newly
computed hash.

## Apply

Apply performs:

1. Acquire the exclusive Target write boundary.
2. Re-read config, package state, Artifacts, and current Target state.
3. Re-run all Modules and global composition.
4. Recompute the execution hash.
5. Abort without writing when it differs from the approved hash.
6. Stage bounded text/JSON publications and complete Managed Trees.
7. Validate staged content and paths.
8. Publish Outputs in deterministic order.
9. Re-observe the Target and report the resulting state.

Effect scopes own temporary files, processes, and lock release while the runtime
lives. The host uses `@effect/platform` services rather than direct global I/O.

## Failure And Rerun

V1 does not promise crash-atomic multi-Output application and has no rollback
journal. A Managed Tree is fully staged before replacement, but a process can
still die between publications.

Any partial failure is reported as failure. A subsequent plan compares current
Target state with current desired state: completed Outputs become no-ops and
remaining work stays visible. The user approves the new hash and reruns.

Prelude never writes `.prelude/`, a receipt, a previous base, or an output
inventory. Temporary runtime debris uses reserved temporary names and is
cleaned when observed safely.

## Check

`prelude check` performs:

1. Re-run the complete plan.
2. Fail before commands when Outputs differ, Requirements are unsatisfied,
   Issues exist, or composition conflicts.
3. Canonically order all target Checks.
4. Execute them serially in their declared package roots without a shell.
5. Continue after failures and report the complete result set.
6. Replan after commands and fail if managed surfaces changed.

Checks must not install packages, patch files, run migrations, or modify active
managed/control surfaces. Verification failure does not roll back a completed
apply.

## Executable Config Preparation

For `eslint.config.mjs` and similar target-owned code:

1. The Harness package exports a stable reusable config API.
2. The Module observes that the effective policy is absent or incompatible.
3. It returns a blocking Issue and optional Artifact-relative guidance.
4. A Prelude-owned skill proposes a target-specific source patch.
5. The user authorizes that diff.
6. The skill applies it and reruns plan.

Core never guesses JavaScript or TypeScript semantics. A stable import allows
most future policy upgrades to arrive through package selection alone.

## Artifact Upgrade

The preferred Prelude-owned upgrade skill:

1. Captures the old versioned Plan Document in temporary/session storage.
2. Uses pnpm to update selected Prelude or Harness packages.
3. Captures the new Plan Document.
4. Audits declarations that disappeared or moved outside exact Managed Trees.
5. Proposes any target-owned residue cleanup as a separate user-approved diff.
6. Returns to normal plan, approval, apply, and check.

A direct package update remains possible. Core can still converge current
declarations, but without an old Plan the V1 skill cannot guarantee residue
cleanup for omitted bounded Outputs.

## Target-Owned Feedback And Wiki Content

Prelude never updates `effect/feedback/**` or `psychogram/wikis/**`. Domain
workflows may edit those areas after user authorization. A future V2 skill may
turn real Target cases into Harness improvements, but this does not change
Prelude ownership.

## Deferred Lifecycle Products

V1 does not guarantee Integration removal, a TUI, automatic package mutation,
config options, or durable transactional rollback. If later required, they are
designed from the current Contract and Plan Document rather than recovered from
the retired create/maintain system.
