---
name: prelude-upgrade
description: Reconcile a user-authorized Prelude or Harness Artifact upgrade without approving convergence.
---

# Prelude Upgrade And Reconcile

Use this skill from the selected `@sayoriqwq/prelude` Artifact. Keep Plan
snapshots only in temporary or session storage, never in the Target.

For every `prelude plan --json` invocation, capture stdout. Exit status `0` or
`2` is a Plan result: validate captured stdout against the selected Prelude
Plan schema and version. Treat the command as failed only when stdout is not a
valid Plan Document.

1. Capture `prelude plan --json` as the old versioned Plan Document before any
   package change, then record the selected Artifact identities for comparison.
2. Before any real Target mutation, use an isolated temporary copy or session
   replica that preserves the same repo-relative package inputs. Update the
   selected Prelude or Harness packages there and show the complete candidate
   `package.json` and `pnpm-lock.yaml` diff. Clean up the preview. Apply those
   exact bytes only after explicit user authorization, then run `pnpm install
   --frozen-lockfile --force` to materialize the Approved Package Selection without
   dependency re-resolution.
3. Capture a new `prelude plan --json`. Compare old and new declarations by
   Integration and declaration id. Audit bounded Outputs and Managed Trees
   that disappeared, changed kind, or moved locator or target root.
4. For each suspicious old location, inspect current Target bytes and active
   new Output authority. Propose residue cleanup only as a concrete diff that
   does not modify an active managed Output. Cleanup requires separate explicit
   user authorization; do not perform it as part of the package update. Never
   treat Integration `feedback/**` as residue: it is Target-owned and remains
   untouched across upgrades.
5. Return the new Plan for normal user approval, `prelude apply` with that
   approved hash, and `prelude check`. Do not approve an execution hash.

Without an old Plan Document, a direct package update remains possible, but
residue guarantees are weaker: current declarations can converge while omitted
bounded Outputs or retired trees may need manual inspection.

Completion: old/new Plan comparison and any separately authorized cleanup are
reported, and the user has the current Plan/apply/check path.
