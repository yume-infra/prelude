# Effect Observability

> Logging, tracing, and diagnostics for CLI execution.

---

## Contracts

- Put logs inside the Effect that actually executes; constructing an Effect does not run it.
- Create spans around meaningful runtime phases such as command execution, plan build/apply, template render, project generation, preview, and finish.
- Keep span names intentional and consistent with existing names in `apps/cli/src/core/services/*`.
- Add annotations at phase boundaries when they help understand runtime behavior.
- Keep smoke diagnostics concise and actionable; generated-project checks should say what failed and where.

## Use When

- Adding a new runtime phase, smoke diagnostic, or command execution step.
- Editing `apps/cli/src/core/services/tracing.ts`, `observability.ts`, `command.ts`, `compose.ts`, `orchestrator.ts`, `planner.ts`, or `template-engine.ts`.
- Reviewing noisy or inconsistent diagnostics.

## Refactor Signals

- Logs are created outside the Effect and never execute.
- Tracing metadata is scattered through leaf helpers with no phase boundary.
- Smoke output is verbose but does not identify the target path, preset, command, or generated project that failed.

