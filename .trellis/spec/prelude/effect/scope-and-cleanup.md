# Effect Scope And Cleanup

> Deterministic cleanup and rollback for generated filesystem state.

---

## Contracts

- Use scoped lifecycle control when created files, directories, or post-generate actions need deterministic cleanup.
- Attach cleanup to the resource boundary that creates the resource.
- Use finalizers when cleanup depends on the operation result.
- Preserve the original failure. Cleanup failures may be logged, but they must not hide the failure that triggered rollback.
- Prefer explicit lifecycle modeling over mutable cleanup lists that are owned by distant callers.

## Use When

- Editing plan apply/materialization code under `apps/cli/src/core/services/plan/`.
- Changing rollback behavior for file writes, directory creation, package manifest actions, or generated project cleanup.
- Adding post-generate file actions or command execution that can partially succeed.

## Refactor Signals

- A caller has to remember cleanup for a resource it did not create.
- Rollback can mask the original error.
- Failure cleanup relies on process-global state or ad hoc mutation instead of scope-owned finalization.

