# Backend Development Guidelines

> Agent-facing conventions for backend-like work in the `examples` package.

---

## Overview

`apps/examples` has no backend runtime. It is an ignored generated-output area used by linked CLI smoke tests. Backend guidance here mostly prevents agents from adding source code in the wrong place.

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Examples package layout and generated root | Filled |
| [Database Guidelines](./database-guidelines.md) | No-database and disposable output boundary | Filled |
| [Error Handling](./error-handling.md) | Smoke failure formatting and cleanup behavior | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Linked smoke validation standards | Filled |
| [Logging Guidelines](./logging-guidelines.md) | Smoke phase logs and diagnostics | Filled |

## Pre-Development Checklist

- Read `apps/examples/README.md` before touching this package.
- Read `apps/cli/tests/linked-examples.smoke.ts` before changing linked smoke behavior.
- Fix generated output issues in `apps/cli/templates/` or CLI runtime, not in `.generated/`.

## Language

These `.trellis/spec` files are written in English so future AI agents can ingest them consistently.
