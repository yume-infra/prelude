---
name: generated-scaffold-audit
description: Audits create-yume generated React and Vue scaffold output, traces quality issues back to scaffold sources, and preserves generated-project verification vocabulary. Use when checking generated project quality, scaffold DX, generated lint failures, template source mapping, or preset audit workflows.
---

<objective>
Guide agents through the create-yume generated scaffold quality audit workflow without re-inventing the M005 process. The skill keeps generated React and Vue projects as the source of truth, separates audit findings from template/source-map work, and preserves the zero-warning generated lint gate vocabulary.
</objective>

<quick_start>
For generated scaffold quality work, read and follow `workflows/audit-generated-output.md` first. Start from real generated React or Vue output, record command evidence, then trace findings to template, policy, dependency, or build surfaces only after the generated-output symptom is clear.
</quick_start>

<routing>
Use `workflows/audit-generated-output.md` for requests involving generated project quality, scaffold lint cleanliness, generated smoke evidence, React or Vue preset audits, template source mapping, or generated-output regressions.
</routing>

<success_criteria>
The skill succeeds when agents use the routed workflow, validate real generated output before assigning ownership, preserve the distinction between lint failures and build warnings, and report evidence with commands such as `lint --max-warnings=0` where lint gates apply.
</success_criteria>
