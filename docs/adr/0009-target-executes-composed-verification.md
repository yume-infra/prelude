---
status: accepted
date: 2026-07-10
amended: 2026-07-12
---

# Target executes composed verification

Harness Modules declare target verification as structured expectations. Prelude owns the declaration contract, validates and globally composes all Harness expectations, renders them in the Convergence Plan, and exposes `prelude check` as the unified executor. The target invokes that command in its own checkout and CI environment.

V1 verification declarations are post-convergence target commands only. Prelude does not expose separate file-presence, tree-digest, structured-value, Package Requirement, or issue check variants: `prelude check` first replans and proves those conditions directly from Outputs, Requirements, and Issues. Target commands run only after Outputs already match desired state, Package Requirements are satisfied, and Issues are empty. Prelude replans again after command execution to detect mutation of managed surfaces.

A V1 target command contains only an Integration-scoped stable id, human summary, exact target package root, and nonempty argv. Prelude executes argv directly with that package root as cwd and does not invoke a shell. Harnesses cannot declare shell expressions, environment overrides, retry policy, alternate success codes, or executable callbacks. Commands inherit the target invocation environment, exit code zero means success, and host-level timeout or termination policy remains Prelude implementation policy rather than Module contract.

Checks are independent assertions, not a workflow graph. Prelude orders them canonically by Integration id and check id, executes them serially, continues after individual failures, and reports the complete failure set. V1 has no dependencies, priorities, ordering hints, or shared produced state between checks. Any mutation of managed surfaces detected by the final replan fails the composed check.

Harnesses do not own generic `package.json` scripts such as `typecheck`, `test`, `lint`, `prepare`, or `verify`. A bootstrap skill may add `verify: prelude check` as target-owned convenience, but correctness never depends on that alias. Mutation commands such as `effect-tsgo patch` are external preparation, not verification.

Apply and target verification have separate failure semantics. Apply materializes the approved Harness outputs and performs host-native structural checks. A later verification failure does not roll back already published outputs; it blocks delivery until target-owned content or preparation is repaired and `prelude check` passes.

## Consequences

Verification commands execute with target-selected dependencies and environment. They must not install packages, fix files, perform migrations, or mutate Harness-managed and control-plane surfaces. Prelude rechecks those surfaces after command execution. Multiple Harnesses compose through one target executor rather than competing for generic scripts.
