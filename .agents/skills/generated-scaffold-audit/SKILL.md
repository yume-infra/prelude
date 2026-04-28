---
name: generated-scaffold-audit
description: Audits create-yume generated React and Vue scaffold output, traces quality issues back to scaffold sources, and preserves generated-project verification vocabulary. Use when checking generated project quality, scaffold DX, generated lint failures, template source mapping, or preset audit workflows.
---

<objective>
Guide agents through the create-yume generated scaffold quality audit workflow without re-inventing the M005 process. The skill keeps generated React and Vue projects as the source of truth, separates audit findings from template/source-map work, and preserves the zero-warning generated lint gate vocabulary.

Use this skill to produce command-backed audit reports that a later fixer can source-map to durable owners without relying on ignored generated workspaces.
</objective>

<quick_start>
For generated scaffold quality work, read and follow `workflows/audit-generated-output.md` first. Start from real generated React or Vue output, record command evidence, then trace findings to template, policy, dependency, or build surfaces only after the generated-output symptom is clear.

When writing the audit handoff, copy and fill `templates/audit-report.md`; use `references/classification-vocabulary.md` and `references/create-yume-generated-quality.md` for classification names, preset boundaries, and ownership vocabulary.
</quick_start>

<routing>
Use `workflows/audit-generated-output.md` for requests involving generated project quality, scaffold lint cleanliness, generated smoke evidence, React or Vue preset audits, template source mapping, or generated-output regressions.
</routing>

<reference_index>
All domain knowledge lives in `references/`:

**Classification vocabulary:** `classification-vocabulary.md`
**create-yume generated quality boundaries:** `create-yume-generated-quality.md`
</reference_index>

<template_index>
Reusable output structures live in `templates/`:

**Audit report handoff:** `audit-report.md`
</template_index>

<workflows_index>
| Workflow | Purpose |
|---|---|
| `audit-generated-output.md` | Runs the output-first generated scaffold audit and prepares the source-mapped report handoff. |
</workflows_index>

<success_criteria>
The skill succeeds when agents use the routed workflow, validate real generated output before assigning ownership, preserve the distinction between lint failures and build warnings, keep minimal presets build-only, and report evidence with commands such as `lint --max-warnings=0` where lint gates apply.
</success_criteria>
