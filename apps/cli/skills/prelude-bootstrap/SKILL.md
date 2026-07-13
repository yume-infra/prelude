---
name: prelude-bootstrap
description: Prepare a pnpm Control Root for Prelude convergence after explicit user authorization.
---

# Prelude Bootstrap

Use this skill from the selected `@sayoriqwq/prelude` Artifact. Work at the
Control Root containing `package.json`.

For every `prelude plan --json` invocation, capture stdout. Exit status `0` or
`2` is a Plan result: validate captured stdout against the selected Prelude
Plan schema and version. Treat the command as failed only when stdout is not a
valid Plan Document.

1. Inspect the root package state and requested exact Prelude and Harness
   Artifact versions, then derive only the requested `id`, `module`, and
   explicit nonempty `packageRoots` Integration entries. Stop if an exact
   package selection, package-root set, or Integration is ambiguous.
2. Before any real Target mutation, use an isolated temporary copy or session
   replica that preserves the same repo-relative package inputs. In that copy,
   use pnpm to generate the complete candidate `package.json`,
   `pnpm-lock.yaml`, and minimal `.prelude/config.jsonc`; the config contains
   `schemaVersion: 2` and the selected Integrations only. Show the concrete
   diffs for all three files together. Clean up the preview. Do not pre-create
   Integration Workspaces or their `managed/`, `repos/`, or `feedback/` zones.
3. Apply its exact three-file bytes to the real Target only after explicit user
   authorization of that exact candidate. Run `pnpm install --frozen-lockfile
   --force` to materialize that Approved Package Selection without dependency
   re-resolution. Confirm the root package, lockfile, installed graph, and
   config select the requested values.
4. Run `prelude plan --json` and return the Plan Document and blockers for
   review. Do not run `prelude apply` and do not approve an execution hash.

The `.prelude/config.jsonc` file is Prelude control data. Encoded Integration
Workspaces are created by normal convergence. Never author or remove
Target-owned `feedback/**` content.

Completion: the root selects the requested Artifacts, the minimal config is
valid, and the user has a current Plan to inspect.
