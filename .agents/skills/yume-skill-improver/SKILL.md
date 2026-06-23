---
name: yume-skill-improver
description: "Improve an `@sayoriqwq/prelude` project-local skill from concrete execution evidence. Use when a skill triggered poorly, missed context, asked weak questions, produced an incomplete handoff, caused rework, or needs a focused behavior revision with validation and residual-risk reporting."
---

# @sayoriqwq/prelude Skill Improver

Use this skill when revising a project-local skill because real execution showed that the skill did not guide Codex well enough. The goal is a minimal durable skill patch that prevents the observed failure class without turning the skill into a transcript, task log, or broad rewrite.

## Trigger Conditions

Use this skill when the request includes concrete evidence such as:

- A user complaint about a specific skill run.
- A transcript excerpt, prompt, final response, bad handoff, weak plan, missed question, or incorrect trigger.
- A failed command, missing validation, stale reference, wrong file owner, or repeated rework caused by skill instructions.
- A request to make a project-local skill more autonomous, less vague, safer under parallel work, or better at using `@sayoriqwq/prelude` evidence.

Do not use this skill for creating a brand-new skill from scratch; use `skill-creator` for general skill creation and the relevant yume planning skill for domain-specific scope. Do not rename or refactor unrelated skills unless the task explicitly grants ownership.

## Evidence Intake

Start from evidence, not preference.

1. Identify the target skill directory and confirm write ownership.
2. Record the evidence type: user complaint, transcript excerpt, output artifact, command log, diff, review comment, or handoff.
3. Extract the smallest failure statement:
   - Expected behavior:
   - Actual behavior:
   - Missing or harmful instruction:
   - Observable consequence:
4. Read only the target skill files needed to understand the failure. Read adjacent skills only for style, routing, or reusable workflow patterns.
5. When the evidence concerns a missed workflow, wrong skill, or weak process handoff, inspect `AGENTS.md` and `.trellis/workflow.md` before patching a target skill. Confirm whether the project entrypoint explained how to select and execute skills.
6. If the evidence is too vague to diagnose, ask for the missing artifact or narrow the patch to clearly stated behavior only.

## Diagnosis Taxonomy

Classify the failure before editing. Multiple classes may apply, but the patch should name the primary class.

| Class | Symptom | Durable fix shape |
| --- | --- | --- |
| Trigger metadata | Skill did not trigger, triggered too broadly, or shadowed a better skill. | Rewrite frontmatter `description` and trigger conditions with concrete positive and negative cases. |
| Evidence gap | Skill allowed work to start from intuition instead of artifacts. | Add an evidence intake step, required fields, or stop condition for missing proof. |
| Workflow gap | Agent skipped an important sequence, quality gate, ownership check, or handoff step. | Add or reorder workflow steps; keep them imperative and testable. |
| Reference gap | Agent lacked stable project context, examples, scripts, templates, or source-of-truth paths. | Point to the minimal existing reference or add a small bundled resource only when repeated loading would be wasteful. |
| Tooling/script gap | Agent repeatedly hand-rolled fragile commands or validation. | Add or update a deterministic script when the operation is repetitive and exact. |
| Over-broad instruction | Skill encouraged unrelated cleanup, large rewrites, or ownership creep. | Add boundaries, stop conditions, and narrower success criteria. |
| Stale project knowledge | Skill contradicts current `.trellis/spec/`, `.trellis/user/`, or repository workflow. | Update the skill to follow current source of truth; make a docs/spec sync judgment if a durable policy gap is found. |
| Validation gap | Skill lacked proof that the revised behavior works. | Add targeted validation, manual cold-read expectations, or forward-test instructions. |
| Output gap | Handoff omitted evidence, decisions, risks, or next actions. | Add a compact output template with required fields. |
| Entrypoint routing gap | `AGENTS.md` or Trellis workflow did not make skill/workflow usage explicit enough for the model to follow. | Add concise entrypoint routing rules and keep detailed procedure in the target skill. |

## Minimal Patch Workflow

1. Inspect the current state.
   - Run `git status --short`.
   - Read the target `SKILL.md` frontmatter and the sections implicated by the evidence.
   - Check whether other workers own adjacent files; respect task write boundaries.

2. Define the patch target.
   - Name the failure class from the taxonomy.
   - Decide whether the fix belongs in frontmatter, trigger conditions, workflow steps, references, scripts, validation, output format, or boundaries.
   - Prefer one targeted section edit over a full rewrite unless the skill is structurally unusable.
   - For workflow incidents, answer these routing questions before editing: Did `AGENTS.md` clearly explain skill workflow usage? Did the agent use the correct skill and the workflow inside it? Did the loaded skill still produce a poor result because of missing gates, evidence, or validation?

3. Patch for future behavior.
   - Use concise imperative instructions.
   - Preserve progressive disclosure: keep `SKILL.md` lean and add references only when details are optional or long.
   - Make negative routing explicit when another skill should handle the request.
   - Add stop conditions for missing evidence, ambiguous ownership, or unsafe write scope.
   - Do not encode one-off task facts unless they reveal a reusable rule.

4. Validate the skill artifact.
   - Run the skill validator when available, for example:
     ```bash
     python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/<skill-name>
     ```
   - Run `git diff --check`.
   - Manually cold-read the changed skill as if it were loaded for a future task.
   - If bundled scripts changed, run their focused checks.

5. Make the knowledge sync judgment.
   - Use `yume-docs-spec-sync` after skill changes.
   - Usually no `.trellis/spec/` or `.trellis/user/` update is needed for a project-local skill revision that follows existing contracts.
   - Update `.trellis/spec/` only if the work reveals a durable repository, generated-output, verification, or workflow rule not currently captured.
   - Update `.trellis/user/` only if humans need new project navigation or operating context.

## Forward Testing

Prefer forward-testing when the revision changes behavioral judgment rather than wording:

- Trigger routing changes that could affect when multiple skills apply.
- New evidence gates or stop conditions.
- New output templates that should shape future handoffs.
- Workflow changes intended to reduce repeated rework.

When safe and available, ask an isolated subagent to apply the revised skill to a realistic prompt or sanitized transcript. Give the subagent the target skill and raw evidence, but do not leak the intended diagnosis or patch. Treat the result as evaluation evidence, not as a substitute for your own review.

Do not spawn subagents when the task forbids it, the write boundaries are unsafe, or the revision is a narrow wording/frontmatter correction that can be validated by cold read.

## Ownership Boundaries

- Edit only the target skill directory and task-local tracking files authorized by the current task.
- Read adjacent project-local skills for examples, but do not rename or revise them without explicit ownership.
- Do not edit `.trellis/spec/` or `.trellis/user/` unless the knowledge sync judgment identifies a concrete durable policy gap and the task permits that write.
- Do not broaden a skill-improvement task into source-code refactors, generated-output fixes, dependency maintenance, or release readiness. Route those to the relevant yume skill.
- Preserve user or parallel-worker changes. If the target skill changed unexpectedly, inspect the diff and patch around it instead of reverting.

## Output Format

Use this handoff shape:

```markdown
## Skill Improvement Summary

- Target skill:
- Evidence used:
- Routing assessment:
- Primary diagnosis:
- Patch shape:
- Files changed:
- Validation:
- Forward test:
- Knowledge sync judgment:
- Residual risk:
```

For unresolved issues, include the missing evidence, the sections inspected, the unsafe assumption you avoided, and the next smallest validation step.

## Success Criteria

The skill improvement succeeds when the changed instructions clearly route the observed failure class, the patch is minimal and durable, validation evidence is recorded, ownership boundaries are respected, and residual risk is explicit enough for the next worker to decide whether more testing or policy capture is needed.
