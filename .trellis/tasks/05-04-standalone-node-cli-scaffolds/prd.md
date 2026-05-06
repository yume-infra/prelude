# PRD-2: Standalone Node And CLI Scaffolds

## Goal

Add standalone Node-oriented and CLI tool scaffold capabilities after the generation model foundation is accepted.

## Dependencies

* Requires PRD-1 accepted.
* Can run in parallel with PRD-3 after PRD-1, because standalone Node/CLI templates and workspace root materialization should not edit the same target contracts except through the accepted generation model.

## Requirements

* Add standalone Node-oriented scaffold ownership and package manifest contributions.
* Add standalone CLI tool scaffold ownership and package manifest contributions.
* Use TypeScript ESM for generated Node/CLI packages.
* Use a tsdown-oriented build baseline unless the implementing agent records a stronger local reason.
* Generated CLI tools must include:
  * executable source entrypoint,
  * npm `bin` metadata,
  * shebang handling,
  * build script,
  * invocation smoke test.
* Initial CLI toolkit may be `none` or minimal local parsing; do not introduce a CLI framework unless the PRD is updated.
* Preserve existing React/Vue standalone behavior.

## Acceptance Criteria

* [ ] A standalone Node-oriented project can be generated and validated.
* [ ] A standalone CLI tool can be generated, built, and invoked through its generated `bin`.
* [ ] CLI generated output includes `type: module`, build script, `bin`, shebang, and documented output path.
* [ ] Dry-run preview shows Node/CLI templates, package manifest changes, and ownership traces.
* [ ] Existing React/Vue standalone tests remain green.

## Validation

* `pnpm --filter create-yume test -- planner`
* `pnpm --filter create-yume test -- template-render`
* `pnpm --filter create-yume test -- generated`
* `pnpm --filter create-yume typecheck`
* Add or update smoke coverage for generated standalone CLI invocation.

## Likely Files

* `apps/cli/src/core/ownership/model.ts`
* `apps/cli/src/core/template-registry/`
* `apps/cli/src/core/owners/`
* `apps/cli/src/core/modifier/package-json.ts`
* `apps/cli/templates/fragments/`
* `apps/cli/tests/template-render.spec.ts`
* `apps/cli/tests/generated-projects.smoke.ts`
* `.trellis/user/create-yume.md`

## Out of Scope

* Workspace/monorepo generation.
* Backend framework choices beyond a minimal placeholder unless a downstream PRD makes them concrete.
* CJS output, serverless packaging, deployment templates, and external CLI toolkits.

## Parallelization Notes

Node-oriented templates and CLI-specific templates can split after the shared ESM/build contract is documented. CLI smoke/docs can run separately from Node template work.
