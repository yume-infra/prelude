# audit existing project-local skills

## Goal

Review the existing non-`trellis-` project-local skills before renaming, trusting, or extending them.

This task is an audit/report pass only. It records decisions and recommended follow-up implementation work without editing, renaming, moving, or deleting existing skill directories.

## Requirements

- Audit `.agents/skills/generated-scaffold-audit`.
- Audit `.agents/skills/update-template-deps`.
- Decide whether each should be renamed to a `yume-` prefix, revised in place, split, or retired.
- Validate trigger descriptions, bundled resources, verification guidance, and alignment with current create-yume specs.

## Inputs Reviewed

- `.trellis/tasks/05-07-agent-autonomy-skill-gaps/parallel-plan.md`
- `.agents/skills/generated-scaffold-audit/SKILL.md`
- `.agents/skills/generated-scaffold-audit/references/classification-vocabulary.md`
- `.agents/skills/generated-scaffold-audit/references/create-yume-generated-quality.md`
- `.agents/skills/generated-scaffold-audit/workflows/audit-generated-output.md`
- `.agents/skills/generated-scaffold-audit/templates/audit-report.md`
- `.agents/skills/update-template-deps/SKILL.md`
- `.agents/skills/update-template-deps/scripts/update_template_deps.py`
- `.agents/skills/update-template-deps/agents/openai.yaml`
- New yume skill routing context: `yume-docs-spec-sync`, `yume-template-source-map-fixer`, `yume-preset-expansion-planning`, `yume-release-readiness`, and `yume-skill-improver`
- Relevant specs and user context:
  - `.trellis/spec/create-yume/index.md`
  - `.trellis/spec/create-yume/verification/index.md`
  - `.trellis/spec/create-yume/verification/generated-scaffold-audit.md`
  - `.trellis/spec/create-yume/repository/index.md`
  - `.trellis/spec/create-yume/generation-model/index.md`
  - `.trellis/spec/create-yume/template-system/index.md`
  - `.trellis/spec/create-yume/workspace-packages/index.md`
  - `.trellis/user/generated-scaffolds.md`

## Audit Findings

### `.agents/skills/generated-scaffold-audit`

Decision: revise in place through a future implementation task; do not rename, split, or retire now.

Rationale:

- The skill is structurally valid and already has a focused audit/report role: produce command-backed generated scaffold quality evidence, classify findings, and hand off source-map ownership without editing ignored generated workspaces.
- The trigger description is accurate for generated project quality, scaffold DX, generated lint failures, template source mapping, and preset audit workflows. The body narrows the task to audit reports and says source fixes should be handled later.
- Bundled resources are useful and cohesive:
  - `workflows/audit-generated-output.md` gives an output-first process.
  - `references/classification-vocabulary.md` and `references/create-yume-generated-quality.md` preserve durable finding classes and preset policy.
  - `templates/audit-report.md` gives a complete handoff format.
- Verification guidance aligns with current specs: full presets use `pnpm lint --max-warnings=0`, minimal presets remain build-only, Tailwind/lightningcss messages are build-warning evidence, and generated output is evidence rather than the durable repair surface.
- The skill is currently a documented contract. `.trellis/spec/create-yume/verification/generated-scaffold-audit.md`, `apps/cli/tests/generated-scaffold-audit-skill.spec.ts`, and new yume skills reference the existing `generated-scaffold-audit` name/path.

Risks and gaps:

- Naming is inconsistent with the new `yume-*` convention, even though the skill is create-yume-specific.
- The frontmatter still mentions "React and Vue scaffold output" even though current create-yume specs now include Node, CLI, library, and structured workspace generated surfaces. The body and references are heavily React/Vue-era and should be reviewed before future audits use this skill for non-frontend generated output.
- The trigger phrase includes "template source mapping", which now overlaps with `yume-template-source-map-fixer`. The existing body routes report-only work correctly, but the frontmatter could trigger too broadly for fixing tasks.

Follow-up recommendation:

1. Create a focused skill-improvement task to revise `generated-scaffold-audit` in place:
   - Keep the existing name/path unless the task explicitly chooses a coordinated rename.
   - Update trigger wording to route report-only generated audits here and source fixes to `yume-template-source-map-fixer`.
   - Expand scope language from React/Vue-only to current supported generated surfaces while preserving frontend-specific lint/build warning policy where applicable.
   - Keep required references to `.trellis/spec/create-yume/verification/generated-scaffold-audit.md`.
2. Defer any rename to `yume-generated-scaffold-audit` unless maintainers want naming uniformity enough to update all hard references in specs, tests, and yume skill routing. If renamed later, do it as a coordinated compatibility change, not a mechanical directory move.

### `.agents/skills/update-template-deps`

Decision: revise in place through a future implementation task; do not rename, split, or retire now.

Rationale:

- The skill is structurally valid and captures a real create-yume workflow: generated package dependency freshness must update generator source literals rather than ignored generated output.
- The trigger description is aligned with current supported scope. The generation model now includes React, Vue, Node, CLI, library, and workspace package outputs, so the broader family list is not stale.
- The bundled script has a clear first-version contract:
  - It builds a temporary probe manifest from known generator source files.
  - It runs installed workspace `taze` instead of guessing registry versions.
  - It can check or update covered source literals and pnpm package-manager metadata.
- The verification guidance points to package manifest and workspace tests plus typecheck, which matches repository/template-system expectations for dependency literal changes.
- Repository specs explicitly keep dependency freshness checks separate from `verify` and require installed `taze`, so the skill's core approach matches current policy.

Risks and gaps:

- The skill has no visible required-reading section. A future agent could run updates without first checking the repository/template-system dependency rules, especially the Node engine floor compatibility requirement.
- The script's covered source list is static. New dependency storage patterns or generated package owners can be missed silently unless the agent notices that a generated manifest path is outside `SOURCE_FILES`.
- The script uses regex over TypeScript source. That is acceptable for the documented first-version literal shapes, but the skill should make the coverage limitation more prominent and require extension before trusting results for new manifest contribution styles.
- The verification section does not explicitly mention reviewing `taze` node compatibility output or updating standalone, workspace-root, and workspace-child `engines.node` together, even though `.trellis/spec/create-yume/template-system/index.md` requires that.
- `scripts/__pycache__/update_template_deps.cpython-314.pyc` exists inside the skill directory. It is not part of the skill contract and should not be treated as a resource; a cleanup follow-up can remove it if maintainers want a tidier skill bundle.

Follow-up recommendation:

1. Create a focused skill-improvement task to revise `update-template-deps` in place:
   - Add required reading for `.trellis/spec/create-yume/repository/index.md`, `.trellis/spec/create-yume/template-system/index.md`, and `.trellis/spec/create-yume/verification/index.md`.
   - Add an explicit pre-update coverage check: compare changed/generated dependency owners against the script's `SOURCE_FILES`, and extend the script before trusting unsupported storage patterns.
   - Add Node engine compatibility guidance from the template-system spec.
   - Add a handoff template that records dependency updates, package-manager updates, source files changed, verification run, and residual coverage risk.
2. Do not rename to `yume-update-template-deps` unless maintainers decide all project-local create-yume skills need the prefix. The current name is already referenced by new yume planning/release skills and by archived task history, and its command path is embedded in user-facing skill instructions.
3. Do not split the script into a separate skill now. The workflow and script are tightly coupled; split only if broader dependency maintenance grows beyond generated template/source literal updates.

## Cross-Skill Routing Judgment

- `generated-scaffold-audit` should remain the report-only, output-first evidence workflow.
- `yume-template-source-map-fixer` should own durable source fixes after generated-output symptoms are known.
- `update-template-deps` should remain the dependency freshness/update workflow for generated template/package manifest literals.
- `yume-preset-expansion-planning` should route dependency freshness-only work to `update-template-deps` and generated-output audit-only work to `generated-scaffold-audit`.
- `yume-release-readiness` should treat `generated-scaffold-audit` and `update-template-deps` as supporting checks, not as release readiness replacements.

## Validation

- `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/generated-scaffold-audit` passed.
- `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/update-template-deps` passed.
- Manual cold read completed for both existing skills, their bundled files/scripts, new yume skill routing context, and relevant create-yume specs.
- `git diff --check` passed.

## Knowledge Sync Judgment

- `.trellis/spec/` update: no
  - Target: none
  - Reason: The audit follows existing repository, verification, template-system, and generated scaffold audit contracts. It does not change durable project behavior or introduce a new executable rule.
- `.trellis/user/` update: no
  - Target: none
  - Reason: The audit only records task-local skill maintenance recommendations and does not change supported scaffold scope, architecture, onboarding, or human operating guidance.
- Existing contract followed: Generated scaffold audit policy, dependency freshness separation from verification, `taze` as installed dependency tooling, and `.trellis/spec`/`.trellis/user` source-of-truth split.
- Verification: skill validator on both existing skills; manual cold read; `git diff --check`.
- Residual risk: The audit did not run the `update-template-deps` `taze` check/update workflow or generated scaffold smoke commands because no existing skill behavior was changed in this pass.

## Acceptance Criteria

- [x] Each existing skill has an audit finding summary.
- [x] Rename/refactor decisions are recorded with rationale.
- [x] Proposed changes are recorded as follow-up implementation recommendations rather than implemented in this pass.
- [x] Trigger descriptions, bundled resources/scripts, verification guidance, and current spec alignment were reviewed.
- [x] Knowledge Sync Judgment is included.
- [x] Validation commands are recorded after `git diff --check` passes.

## Out of Scope

- Renaming or editing the existing skills in this task creation pass.
- Creating follow-up task directories.
- Editing `.trellis/spec/`, `.trellis/user/`, source code, package files, or existing skill directories.
