# Create Yume Spec Index

> Agent-facing source of truth for the `create-yume` CLI monorepo.

---

## Overview

`create-yume` is not a traditional two-layer web application. It is a pnpm workspace whose primary package, `apps/cli`, is an Effect-based TypeScript CLI that plans and materializes local project scaffolds.

Use domain-specific layers instead of generic web-app layers.

## Layers

| Layer | Scope |
| --- | --- |
| [CLI Runtime](./cli-runtime/index.md) | CLI entrypoint, args, prompts, Effect services, command/fs boundaries, errors |
| [Generation Model](./generation-model/index.md) | `ProjectConfig`, create spec, presets, supported product boundaries |
| [Template System](./template-system/index.md) | template registry, Handlebars helpers, materialization strategies, owner contributions |
| [Workspace Packages](./workspace-packages/index.md) | workspace root generation, child package generation, target-aware manifests |
| [Verification](./verification/index.md) | unit, snapshot, generated smoke, linked examples, documentation/spec gates |
| [Effect](./effect/index.md) | local Effect style baselines used by the CLI runtime |
| [Repository](./repository/index.md) | monorepo layout, dependencies, commits, user/spec documentation rules |

## Pre-Development Checklist

- Identify which CLI surface is being changed: runtime, generation model, templates, workspace packages, verification, Effect style, or repository docs.
- Read the matching layer index and any scenario contract linked from it.
- Read `.trellis/spec/guides/index.md` for thinking triggers.
- For cross-layer changes, define signatures, contracts, validation/error behavior, Good/Base/Bad cases, and tests before editing.
- Keep `.trellis/user/` synchronized when a change alters project maps, supported scope, architecture context, or onboarding/reading order.

## Quality Check

- No new spec or workflow guidance should point to `docs/`.
- No new create-yume spec should use a generic web-app split as the primary model.
- Contracts must reference real code paths, command names, schema fields, or generated target paths.
- User-facing explanations belong in `.trellis/user/`; executable implementation rules belong here.
