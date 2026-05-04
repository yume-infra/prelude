# Frontend Development Guidelines

> Agent-facing conventions for React/Vue scaffold generation.

---

## Overview

This package generates frontend projects; it is not itself a frontend application. Read these guidelines before changing templates, template registries, frontend config, generated smoke tests, or React/Vue scaffold behavior.

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Template and generated-project layout | Filled |
| [Component Guidelines](./component-guidelines.md) | Generated React/Vue component patterns | Filled |
| [Hook Guidelines](./hook-guidelines.md) | React hooks and Vue Composition API usage | Filled |
| [State Management](./state-management.md) | Jotai/Zustand/Pinia/local state conventions | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Generated output validation and forbidden patterns | Filled |
| [Type Safety](./type-safety.md) | Schema, registry, and generated file contracts | Filled |

## Pre-Development Checklist

- Read `docs/agent/handlebars-helpers.md` before changing templates.
- Read `docs/agent/testing.md` before changing generated output tests.
- Inspect generated output or snapshots before deciding a template fix.
- Use `docs/agent/verification-matrix.md` to choose validation.

## Language

These `.trellis/spec` files are written in English so future AI agents can ingest them consistently.
