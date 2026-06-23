# Effect Composition

> Composition style for service orchestration and plan generation.

---

## Contracts

- Prefer `Effect.gen` for sequential effectful logic with local variables, branching, or typed failures.
- Prefer `pipe(...)` with data-last operators for readable transformations.
- Data-first calls are acceptable when a single operation is clearer than a pipeline.
- Do not keep tacit or point-free style when it hides control flow, failure behavior, or dependency reads.
- Keep dependency acquisition near the boundary of the operation that needs it, especially for `CliContext`, `PlanService`, `TemplateEngine`, command execution, and filesystem services.

## Use When

- Editing `apps/cli/src/core/services/*`.
- Expanding workspace package planning or template materialization.
- Refactoring nested effectful code.

## Refactor Signals

- A pipeline requires mental backtracking to understand the generated files, commands, or rollback behavior.
- Error mapping is detached from the operation that can fail.
- Service reads are spread across unrelated helper layers.

