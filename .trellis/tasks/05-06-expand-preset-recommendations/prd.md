# Expand Preset Recommendations

## Goal

Implement the next useful Create Yume presets now that the generator supports workspace roots, Node/CLI scaffolds, structured workspace package generation, and internal workspace dependencies. The first priority is a CLI-focused workspace starter that can dogfood Create Yume's own CLI/library architecture without becoming create-yume-specific.

## Requirements

* Add `workspace-cli-library` as the P0 preset.
* `workspace-cli-library` must generate a pnpm workspace root with:
  * `apps/cli`: an Effect CLI package with `cli.toolkit = "effect"`.
  * `libs/core`: a neutral shared library package.
  * An explicit internal dependency from `apps/cli` to `libs/core`, emitted as `workspace:*`.
* The P0 preset should be opinionated toward CLI workspace projects. More generic workspace graphs should remain available through the structured flow/spec path rather than this preset.
* Add P1 workspace presets:
  * `workspace-fullstack-react`
  * `workspace-fullstack-vue`
* P1 fullstack workspace presets should use existing generated package kinds and internal dependency support, with a frontend app, backend app, and shared neutral library.
* Add P2 standalone presets:
  * `standalone-library-minimal`
  * `standalone-library-node`
  * `standalone-backend-full`
  * `standalone-cli-full`
* Preserve the current canonical preset naming style and keep compatibility aliases only where the repo already supports them.
* Update user-facing CLI preset documentation when the accepted preset list changes.
* Keep worker presets deferred because worker support is currently a schema boundary, not a generated template family.

## Acceptance Criteria

* [ ] `workspace-cli-library` is accepted by the preset schema and non-interactive preset composition.
* [ ] `workspace-cli-library --name <target>` resolves to a workspace root containing `apps/cli` and `libs/core`.
* [ ] The generated CLI package uses the Effect CLI toolkit path.
* [ ] The generated CLI package depends on the generated core library through an explicit `workspace:*` internal dependency.
* [ ] `workspace-fullstack-react` and `workspace-fullstack-vue` resolve to workspace package graphs using existing frontend, backend, and library package support.
* [ ] P2 standalone presets resolve to the correct standalone project configurations without exposing worker generation.
* [ ] README or equivalent user-facing context lists the new presets and keeps worker support out of generated preset claims.
* [ ] Focused tests cover preset schema, preset composition, create-spec/preview behavior where applicable, package graph dependencies, and generated smoke risk for CLI/workspace behavior.

## Definition of Done

* Tests added or updated for every new preset family.
* Lint, typecheck, and focused test commands pass for the touched surfaces.
* Docs and `.trellis/user/` are updated if public supported scope changes.
* No worker preset is exposed.
* Rollout is low risk because presets are additive and existing preset names continue to work.

## Technical Approach

* Extend the preset schema and preset composition mapping rather than adding a separate preset execution path.
* Compose workspace presets through the existing `WorkspaceRootConfig.packages` model so generated output continues through planner, template registry, manifest contribution, and workspace package builders.
* Use `GenerationPackageSpec.internalDependencies` for preset-declared internal links; do not infer dependencies from every package in the workspace.
* For `workspace-cli-library`, default package paths and ids to `apps/cli` and `libs/core`. Use package names derived from the target project name and package ids, matching existing workspace package naming conventions.
* For fullstack workspace presets, prefer conventional package ids such as `web`, `api`, and `shared`, and keep the shared library neutral.
* For standalone P2 presets, reuse existing standalone project config support and full/minimal quality policy already used by current frontend/CLI/backend templates.
* Update docs and generated scaffold expectations only through source templates/tests; do not hand-edit generated output.

## Decision (ADR-lite)

**Context**: The project now supports structured workspace package generation, including CLI tools, libraries, and explicit internal dependencies, but only a subset is exposed through one-command presets.

**Decision**: Implement all useful preset families over time, staged by priority. Start with `workspace-cli-library`, a CLI-focused workspace preset using `apps/cli` and `libs/core`. This is intentionally more opinionated than a fully generic workspace starter because presets should carry a useful project-level shape; users who want arbitrary package ids can use the structured spec/flow path.

**Consequences**: The first implementation batch must prove preset-to-spec composition for workspace package graphs, Effect CLI package generation, and explicit `workspace:*` links. The preset remains reusable for future CLI projects while still dogfooding the architecture that Create Yume itself uses.

## Out of Scope

* Worker presets or worker template materialization.
* Remote templates, plugin-based presets, or existing-project append/update flows.
* A fully arbitrary workspace graph preset.
* Publishable package/release workflow defaults such as Changesets.
* New template families beyond the listed preset priorities unless existing support proves insufficient.

## Technical Notes

* Current preset schema includes canonical standalone frontend presets, workspace root, backend Node, minimal CLI, and Effect CLI presets.
* README documents Create Yume as supporting React, Vue, pnpm workspace root, TypeScript ESM Node, TypeScript ESM CLI tool, and structured workspace package generation.
* Structured package specs already include `frontend-app`, `backend-app`, `worker-app`, `cli-tool`, and `library-package`.
* User-facing docs explicitly say `worker-app` generation is not currently supported, so worker presets must remain deferred.
* Relevant specs for implementation/check context:
  * `.trellis/spec/create-yume/generation-model/index.md`
  * `.trellis/spec/create-yume/workspace-packages/index.md`
  * `.trellis/spec/create-yume/template-system/index.md`
  * `.trellis/spec/create-yume/verification/index.md`
  * `.trellis/spec/create-yume/repository/index.md`
