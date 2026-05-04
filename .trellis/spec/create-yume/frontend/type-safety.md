# Type Safety

> Type and validation patterns for generated frontend scaffolds.

---

## Overview

Frontend generation is type-safe at the config, registry, and generated-file boundary. Use Effect Schema for config contracts and TypeScript generics for template registries.

Generated JavaScript output must remain valid when `language` is `javascript`.

## Rules

- Add or change config fields in `apps/cli/src/schema/project-config.ts` first.
- Keep template registries typed as `TemplateRegistry<ReactProjectConfig>`, `TemplateRegistry<VueProjectConfig>`, or shared `TemplateRegistry<SharedFrontendAppConfig>`.
- Use type guards such as `isReactProject` and `isVueProject` for runtime narrowing.
- Use registry target functions to choose `.ts`, `.tsx`, `.js`, or `.jsx` paths.
- Keep `PlanSpec` projection serializable; templates and generated file actions must be representable.

## Examples

- `apps/cli/src/schema/project-config.ts` defines literal unions for project type, build tool, CSS options, React router, React state-management, linting, and code quality.
- `apps/cli/src/core/template-registry/react.ts` uses `ReactProjectConfig` so React targets can depend on `router` and `stateManagement`.
- `apps/cli/src/core/template-registry/vue.ts` uses `VueProjectConfig` so Vue targets can depend on boolean router/state flags.
- `apps/cli/src/core/services/template-engine.ts` injects `@config` into Handlebars runtime options and disables prototype access.

## Forbidden Patterns

- Do not branch on untyped string config values that are not in Effect Schema.
- Do not widen template registry types to `any`.
- Do not emit TypeScript-only syntax into JavaScript generated files.
- Do not add non-serializable values to plan operation metadata.

## Common Mistakes

- Adding a schema literal but forgetting prompt options or preset defaults.
- Changing a generated extension in a template but not in the registry target.
- Assuming Handlebars templates are type-checked; they need snapshot and smoke coverage.
