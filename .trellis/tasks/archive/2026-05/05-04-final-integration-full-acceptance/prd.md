# PRD-7: Final Integration And Full Acceptance

## Goal

Prove the complete roadmap through canonical standalone and workspace verification matrices, dry-run smoke coverage, knowledge alignment, and final generated scaffold audit.

## Dependencies

* Requires PRD-2 through PRD-6 accepted.
* Runs after product capability tasks are implemented.

## Requirements

* Define and run canonical standalone cases:
  * React frontend app with Vite.
  * Vue frontend app with Vite.
  * CLI tool with TypeScript ESM, build output, `bin`, shebang, and invocation smoke.
  * Backend app placeholder once backend scaffolding becomes concrete.
* Define and run canonical workspace cases:
  * React frontend app + backend app + neutral shared library.
  * Multiple CLI tools in one workspace.
  * Frontend app + CLI tool + neutral shared library with explicit `workspace:*` links.
* Verify spec input dry-run writes nothing.
* Verify root and child paths/actions are auditable in dry-run.
* Verify docs and agent constraints match the shipped scope.

## Acceptance Criteria

* [ ] Existing React/Vue standalone compatibility remains green.
* [ ] Standalone CLI canonical smoke passes.
* [ ] Workspace canonical smoke cases pass.
* [ ] Dry-run proves no writes for spec input.
* [ ] Root-level and child package ownership traces are visible enough to audit.
* [ ] Generated scaffold audit finds no root/child duplication regressions.
* [ ] Documentation and constraints match the final supported product boundary.

## Validation

* `pnpm --filter create-yume build`
* `pnpm --filter create-yume test`
* `pnpm --filter create-yume smoke:generated`
* `pnpm --filter create-yume smoke:examples`
* `pnpm verify`

## Likely Files

* `apps/cli/tests/generated-projects.smoke.ts`
* `apps/cli/tests/dry-run-cli.smoke.ts`
* `apps/cli/tests/linked-examples.smoke.ts`
* `apps/cli/tests/generated-scaffold-audit-skill.spec.ts`
* `.trellis/spec/create-yume/verification/index.md`
* `.trellis/user/create-yume.md`
* `.trellis/spec/create-yume/generation-model/index.md`

## Out of Scope

* New product behavior beyond the accepted canonical matrix.
* Broad dependency upgrades unrelated to generated scaffold acceptance.

## Parallelization Notes

Standalone regression, workspace smoke, and knowledge alignment can run in parallel. Final `pnpm verify` is serial and should run only after all lanes are green.
