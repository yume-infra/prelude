---
status: accepted
date: 2026-07-12
---

# Delete create and defer a new convergence TUI

The create product line is retired without compatibility. GitHub issues #46, #48, and #49 describe `CreateSpec`, project genesis, create resolvers, create WritePlans, maintain initialization, and manifests from the superseded architecture. They are not V1 requirements and do not justify retaining implementation, fixtures, commands, tests, or terminology.

Issue #47 preserves one useful product observation: a future human entry point may benefit from a fullscreen, user-facing terminal workbench with reviewable changes, blockers, ownership, and explicit action. Its accepted UX direction is historical evidence only. The existing workbench is coupled to create semantics and may be deleted completely.

A future TUI, if commissioned after the V1 baseline, will be rebuilt as a presentation adapter over the same versioned Plan Document and plan, apply, and check operations used by agents. It will not restore `CreateSpec`, recipes, project generation, manifests, or a second semantic path. V1 has no TUI delivery obligation.

## Consequences

Prelude is free to replace the existing CLI implementation wholesale with the narrow multi-Harness convergence host proven by Effect Harness and Psychogram in Partita. Missing historical functionality may be reconsidered later from the new Contract baseline; no old surface receives a compatibility shim merely because code or an issue still exists.
