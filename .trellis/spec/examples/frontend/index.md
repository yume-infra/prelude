# Frontend Development Guidelines

> Agent-facing conventions for generated frontend examples.

---

## Overview

`apps/examples` contains generated frontend smoke output, not maintained frontend source. Read these guidelines before changing linked smoke behavior or interpreting `.generated/` failures.

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Generated example layout | Filled |
| [Component Guidelines](./component-guidelines.md) | Generated component conventions | Filled |
| [Hook Guidelines](./hook-guidelines.md) | Generated hook and Composition API patterns | Filled |
| [State Management](./state-management.md) | Generated Jotai/Pinia/local state expectations | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Linked smoke validation | Filled |
| [Type Safety](./type-safety.md) | Generated TypeScript/JavaScript contracts | Filled |

## Pre-Development Checklist

- Read `apps/examples/README.md`.
- Read `apps/cli/tests/linked-examples.smoke.ts`.
- Trace `.generated/` problems back to CLI schemas, templates, owners, or registries.
- Use `docs/agent/verification-matrix.md` for validation.

## Language

These `.trellis/spec` files are written in English so future AI agents can ingest them consistently.
