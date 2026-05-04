# Backend Development Guidelines

> Agent-facing conventions for the `create-yume` CLI runtime.

---

## Overview

`create-yume` has no server backend. This layer covers CLI runtime code in `apps/cli/src/`: Effect services, schemas, plan building/application, command execution, filesystem boundaries, and generated package mutation.

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Database Guidelines](./database-guidelines.md) | Structured data and no-database boundary | Filled |
| [Error Handling](./error-handling.md) | Domain error types and handling strategies | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, testing, forbidden patterns | Filled |
| [Logging Guidelines](./logging-guidelines.md) | Effect logging, spans, and smoke diagnostics | Filled |

## Pre-Development Checklist

- Read `docs/agent/constraint/architecture.md` before changing scaffold boundaries.
- Read `docs/agent/effect/code-style/roadmap.md` and the relevant Effect baseline file before touching services, schemas, composition, or tests.
- Search for existing owner, schema, and template registry patterns before adding new behavior.
- Use `docs/agent/verification-matrix.md` to choose validation.

## Language

These `.trellis/spec` files are written in English so future AI agents can ingest them consistently.
