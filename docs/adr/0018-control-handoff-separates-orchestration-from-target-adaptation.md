---
status: accepted
date: 2026-07-15
supersedes: [0008, 0010]
amends: [0001]
---

# Control Handoff separates orchestration from Target Adaptation

Prelude-owned skills and Harness-delivered skills are complementary phase
owners, not competing Target mutators.

Prelude-owned skills own Control Root bootstrap, selection and configuration of
Harness Integrations, cross-Harness upgrade coordination, Plan presentation,
exact approval handoff, Prelude apply/check execution, and residue cleanup that
crosses or outlives current Harness declarations. Prelude core remains the only
writer of active Harness-owned Outputs.

After Prelude has delivered one Harness's stable Outputs, that Harness may ship
a versioned skill which performs a Control Handoff for domain-specific Target
Adaptation. The Effect Harness skill owns Target-local package-root and
toolchain choices, package and lockfile changes, TypeScript inheritance,
compiler activation, executable ESLint composition, editor landing,
verification commands, suppression decisions, and durable Target-owned
`feedback/**` evidence. A Prelude-owned orchestration skill may invoke or route
to that delivered skill but must not reproduce its Effect policy or silently
make its Target-local choices.

The delivered skill observes and proposes without mutation. The proposal and
authorization decision remain in memory or session state. Only after explicit
authorization may its Mutate phase change Target-owned files or write approved
durable evidence. Material discovery changes require a revised proposal and a
new authorization. No skill approves a Prelude Plan on the user's behalf.

The Harness Module remains read-only across the handoff. The shipped Effect
Harness Module declares exactly one ManagedTree, one ManagedBlock, and two
PinnedReferenceTree Outputs; its Requirements, Issues, and Checks are empty.
Target-specific package policy, JSON policy landing, and verification evidence
belong to the delivered adaptation skill rather than to Prelude core or the
Module Plan.

## Consequences

ADR-0008 and ADR-0010 remain historical rationale for keeping semantic Target
mutation outside Prelude core, but their exclusive assignment of package and
executable-config adaptation to Prelude-owned skills is superseded. Harness
guidance alone has no mutation authority; a delivered skill gains authority
only through explicit user authorization and only over Target-owned surfaces.
Stable managed and reference Outputs still converge exclusively through exact
Prelude Plan approval and apply.
