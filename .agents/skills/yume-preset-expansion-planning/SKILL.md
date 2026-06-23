---
name: yume-preset-expansion-planning
description: "Plan new `@sayoriqwq/prelude` presets or scaffold families before implementation. Use when Codex is asked to add, expand, rename, or expose React, Vue, Node, CLI, library, workspace, or future scaffold-family support and needs implementation-ready scope, contracts, verification, ownership boundaries, and docs/spec sync decisions."
---

# @sayoriqwq/prelude Preset Expansion Planning

Use this skill before implementing a new `@sayoriqwq/prelude` preset, scaffold family, workspace package graph, generated package kind, toolkit track, or supported-scope expansion. The output should be an implementation-ready plan, not code.

## Trigger Conditions

Use this skill when a request mentions any of these:

- New preset names, aliases, or preset defaults.
- New scaffold family support for React, Vue, Node backend, CLI, library, workspace, or a future family such as worker apps.
- New workspace package graph, child package kind, package target directory, or internal dependency shape.
- Exposing currently unsupported scope as supported product behavior.
- Expanding generated output policy, package manifests, generated smoke coverage, or user-facing supported-scope docs.

Do not use this skill for dependency freshness only; use `update-template-deps` instead. Do not use it for generated-output audit only; use `generated-scaffold-audit` first.

## Required Reading

1. Read `.trellis/spec/prelude/index.md`.
2. Read the layer indexes matching the requested expansion:
   - `.trellis/spec/prelude/generation-model/index.md` for presets, taxonomy, create spec, and supported scope.
   - `.trellis/spec/prelude/template-system/index.md` for owner contributions, templates, helpers, manifest policy, and materialization strategy.
   - `.trellis/spec/prelude/workspace-packages/index.md` for workspace roots, child packages, `apps/*` and `libs/*` targets, and `workspace:*` links.
   - `.trellis/spec/prelude/verification/index.md` for the verification matrix and generated smoke policy.
   - `.trellis/spec/prelude/cli-runtime/index.md` when CLI args, `--preset`, `--spec`, `--print-spec`, `--dry-run`, help text, or prompts change.
   - `.trellis/spec/prelude/repository/index.md` for docs/spec source-of-truth and dependency rules.
3. Read `.trellis/user/generated-scaffolds.md` when supported scope, common commands, or human-facing scaffold descriptions may change.
4. Read `yume-docs-spec-sync` when making the final knowledge sync judgment.

## Scope Classification

Classify the request before drafting implementation work:

- **Alias/default-only**: Adds or changes a preset alias or default mapping without new generated files, schema fields, package kinds, manifest policy, or smoke scope.
- **Preset composition**: Adds a new preset from currently supported package kinds and existing template families, such as a new workspace graph assembled from existing frontend, backend, CLI, and library packages.
- **Template expansion**: Adds or changes rendered files, partials, static assets, owner contributions, or generated package manifest policy for an existing family.
- **Scaffold family expansion**: Adds a new supported family, package kind, runtime, toolkit track, or target path convention.
- **Unsupported-scope proposal**: Mentions behavior currently out of scope, such as worker app materialization, existing-project append/update, remote templates, plugin template sources, arbitrary workspace graph UX, publishable packages, or default Changesets/release workflow.

Unsupported-scope proposals must not become implementation PRDs until the plan names the missing spec/user-doc contract, template ownership, schema/planner behavior, and verification gate required to make the claim true.

## Affected-Surface Checklist

For every planned expansion, mark each surface as `yes`, `no`, or `unknown`, then resolve every `unknown` before implementation starts.

| Surface | Questions to answer |
| --- | --- |
| Supported scope | Does `.trellis/spec/prelude/generation-model/index.md` or `.trellis/user/generated-scaffolds.md` need to list the new capability or keep it explicitly out of scope? |
| Preset schema | Does `apps/cli/src/schema/preset.ts` need a new literal, alias, or compatibility mapping? |
| Project config schema | Does `apps/cli/src/schema/project-config.ts` or related generation package spec schema need a new field, runtime, kind, toolkit, or default? |
| Create spec | Does `apps/cli/src/schema/create-spec.ts` need decode/export/round-trip coverage or structured input support? |
| Prompt and preset composer | Does `apps/cli/src/core/questions/compose.ts` need new preset composition, package graph assembly, or interactive defaults? |
| CLI UX | Does `apps/cli/src/core/cli-args.ts`, `apps/cli/src/core/cli-help.ts`, or preset question text need updates? |
| Planner and PlanSpec | Does the change alter owner units, target paths, preview output, dry-run output, or plan/apply validation? |
| Template registry | Does `apps/cli/src/core/template-registry/` need new registry entries, target-scope filtering, or render config behavior? |
| Owners and manifests | Does `apps/cli/src/core/owners/`, `workspace-bootstrap.ts`, or package manifest contribution code need dependency/script/engine/bin ownership changes? |
| Template files | Does `apps/cli/templates/` need fragments, partials, static assets, README content, or separate tracks instead of branching in existing templates? |
| Workspace packages | Does the expansion affect `apps/*`, `libs/*`, package ids, names, root scripts, `workspace:*` links, or missing-target validation? |
| Generated smoke | Does `apps/cli/tests/generated-projects.smoke.ts` or `apps/cli/tests/support/generated-smoke-gate.ts` need a new case, selector, lint gate, build gate, or bin/runtime assertion? |
| Focused tests | Which schema, CLI args, create spec, planner, package manifest, template render, workspace root, dry-run, or generated smoke tests prove the behavior? |
| Docs/spec sync | Which `.trellis/spec/` and `.trellis/user/` files need updates, or why does the existing contract already cover the work? |

## Planning Workflow

1. State the desired product behavior in one paragraph.
   - Name the preset or family exactly.
   - Name whether it is standalone, workspace root, workspace child package, toolkit track, or cross-family composition.
   - Name the generated target paths, such as root files, `apps/<id>`, or `libs/<id>`.

2. Classify the scope using the categories above.
   - If it is `Unsupported-scope proposal`, stop implementation planning and write the policy gap first.
   - If it is `Scaffold family expansion`, require a child PRD for schema/planner contracts and another for templates/generated smoke unless the change is trivially small.

3. Fill the affected-surface checklist.
   - Use real file paths and test names.
   - Do not write "no docs needed" unless the generation-model and repository documentation rules were checked.
   - Do not claim a preset is supported until schema, composition, templates or owner contributions, help/prompt exposure, and generated smoke coverage are accounted for.

4. Define Good/Base/Bad cases.
   - Good: the new supported path through `ProjectConfig -> owners -> Plan -> PlanSpec -> apply`.
   - Base: the closest existing preset or family that must remain unchanged.
   - Bad: at least one unsupported or invalid input that must fail before plan application.

5. Decompose broad work into child PRDs.
   - Split when the work spans three or more major surfaces, introduces a new package kind or runtime, changes generated dependency policy, or adds real generated smoke coverage.
   - Each child PRD must have one owner boundary, a file-surface list, acceptance criteria, verification commands, and docs/spec sync judgment.
   - Prefer separate PRDs for: schema and composition, template/owner materialization, workspace package behavior, generated smoke and audit, and docs/spec updates.

6. Produce the verification matrix.
   - Start from `.trellis/spec/prelude/verification/index.md`.
   - Include focused unit or snapshot tests for every changed contract.
   - Include generated smoke when generated install/build/lint/runtime behavior changes.
   - Use `PRELUDE_SMOKE_CASES=<selector>` only when the selector covers the affected generated surface; otherwise use broader smoke.
   - Use `pnpm verify` for unknown or broad impact.

7. Make the knowledge sync judgment.
   - Use the `yume-docs-spec-sync` judgment format.
   - `.trellis/spec/` usually changes when supported scope, schema contracts, generated target paths, verification gates, manifest policy, or forbidden patterns change.
   - `.trellis/user/` usually changes when humans need to understand newly supported scaffold scope, commands, architecture, or operational caveats.
   - Neither is acceptable only when the plan follows existing contracts and does not alter durable product/project knowledge.

## Child PRD Template

```markdown
# <preset or scaffold family> - <surface>

## Goal

<Implementation-ready behavior and exact supported scope.>

## Scope Classification

- Classification:
- Existing base preset/family:
- Unsupported-scope risks:

## Affected Surfaces

- Schema:
- Composer/planner:
- Templates/owners/manifests:
- Workspace package behavior:
- CLI UX:
- Tests/smoke:
- Docs/spec:

## Contracts

- Good:
- Base:
- Bad:

## Acceptance Criteria

- [ ] <Observable implementation result>
- [ ] <Contract/test result>
- [ ] <Docs/spec judgment completed>

## Verification

- Focused:
- Generated smoke:
- Broad fallback:

## Ownership Boundaries

- May write:
- Read-only:
- Must not change:

## Knowledge Sync Judgment

- `.trellis/spec/` update:
  - Target:
  - Reason:
- `.trellis/user/` update:
  - Target:
  - Reason:
- Existing contract followed:
- Verification:
- Residual risk:
```

## Ownership Boundaries

Planning may read source code, existing skills, `.trellis/spec/`, and `.trellis/user/`, but implementation ownership must be explicit before code changes begin.

- Do not edit generated output under `apps/examples/.generated/`; fix templates, owners, schema, or planner behavior.
- Do not rename existing project-local skills such as `generated-scaffold-audit` or `update-template-deps` as part of preset planning.
- Do not add new external generated dependencies without catalog and manifest-policy ownership.
- Do not expose worker apps, remote templates, plugin template sources, arbitrary workspace graph UX, publishable packages, or Changesets as supported defaults without first updating the relevant specs and generated smoke plan.

## Output Checklist

A complete planning handoff includes:

- Trigger reason and scope classification.
- Affected-surface checklist with real paths.
- Good/Base/Bad cases.
- Child PRD decomposition decision.
- Verification matrix mapped to changed surfaces.
- Ownership boundaries for each implementation worker.
- Knowledge Sync Judgment covering `.trellis/spec/` and `.trellis/user/`.
- Residual risks or blocked decisions.
