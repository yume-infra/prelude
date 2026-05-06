# Raise Node Engine To 22

## Goal

Raise the root workspace Node.js engine floor from Node 18 to Node 22 so the repository no longer advertises support for an EOL runtime while keeping the package manager pinned to the locally used pnpm version.

## Requirements

- Update the root `package.json` `engines.node` field from `>=18` to `>=22`.
- Keep `packageManager` at `pnpm@10.12.4`, matching the current local pnpm version.
- Do not change generated template runtime constraints in this task.

## Acceptance Criteria

- [x] Root `package.json` declares `engines.node` as `>=22`.
- [x] Root `package.json` still declares `packageManager` as `pnpm@10.12.4`.
- [x] `pnpm install --lockfile-only` succeeds without lockfile churn beyond what is necessary.

## Definition of Done

- A focused verification command has run successfully.
- Changes are committed with a conventional commit.

## Technical Approach

Edit the root workspace manifest only. This is a repository configuration change, not a dependency update or generated scaffold behavior change.

## Decision (ADR-lite)

Context: Node 18 is EOL, Node 20 is also EOL as of 2026-04-30, while the local development runtime is Node 25.8.1.

Decision: Use `>=22` as the repo engine floor. It blocks EOL Node 18/20 while remaining less aggressive than requiring the non-LTS local Node 25 line.

Consequences: Users on Node 18/20 will see the workspace as unsupported. Node 22, 24, and 25 remain allowed.

## Out of Scope

- Updating pnpm from `10.12.4`.
- Updating generated project template engine declarations.
- Changing CI matrices or release documentation.

## Technical Notes

- Relevant spec: `.trellis/spec/create-yume/repository/index.md`.
- Shared guide trigger: searched for existing `>=18`, `pnpm@10.12.4`, and `engines` declarations before editing.
