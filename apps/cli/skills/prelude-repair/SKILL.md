---
name: prelude-repair
description: Repair Prelude plan blockers through explicit, target-specific authorization and replan.
---

# Prelude Blocker Repair

Use this skill from the selected `@sayoriqwq/prelude` Artifact. Start with
`prelude plan --json`; read its Requirements, Issues, owners, locators, and
any Artifact-relative guidance referenced by an Issue.

For every `prelude plan --json` invocation, capture stdout. Exit status `0` or
`2` is a Plan result: validate captured stdout against the selected Prelude
Plan schema and version. Treat the command as failed only when stdout is not a
valid Plan Document.

1. Classify each blocker before proposing a write:
   - A package blocker needs an exact root package or lockfile/install repair.
   - An executable-config blocker concerns target-owned code and needs a
     target-specific patch based on Artifact guidance.
   - A Harness or domain blocker needs the Target or Harness owner to resolve
     its stated condition; report the owner and guidance without guessing a
     mutation.
   - A cross-Harness conflict needs an Integration or Harness design decision;
     report every conflicting owner and locator without selecting a winner.
2. For a package repair, before any real Target mutation use an isolated
   temporary copy or session replica that preserves the same repo-relative
   package inputs. Generate and show the complete candidate `package.json` and
   `pnpm-lock.yaml` diff, then clean up the preview. Apply those exact approved
   bytes only after explicit user authorization. Do not install or resolve
   packages in the real Target during repair: the next Plan binds the exact
   manifest and lockfile bytes, and a later approved `prelude apply` may run
   only `pnpm install --frozen-lockfile --force`. For executable-config repair, show the
   precise target-owned-file diff and obtain that same authorization before
   editing it.
3. Never edit a path, block, JSON value, keyed item, or tree declared as a
   managed Output. Never edit or remove Target-owned Integration
   `feedback/**`. Do not turn an unresolved Harness or cross-Harness blocker
   into a local override.
4. After an authorized repair, run `prelude plan --json` only and return its
   current blockers. Do not run apply or approve an execution hash.

Completion: every attempted mutation had a concrete authorized diff, and the
current Plan shows the observed post-repair state.
