---
status: accepted
date: 2026-07-13
---

# Use three exhaustive Output locator roots

Every Output target locator is based on exactly one of three semantic roots:
the Control Root, the declaring Integration's Integration Workspace, or one
Package Root explicitly authorized to that Integration. There is no arbitrary
Target-relative root. Artifact assets remain declaration sources rather than a
fourth target root.

Every Output explicitly selects that semantic root in its decoded Contract
data. There is no default based on Integration configuration, Output
capability, or path. Harness-side builder APIs may reduce authoring repetition
without making the wire plan implicit.

This separates repository-wide shared authority, Integration-local knowledge,
and package-specific authority without making Modules construct paths that
escape an implicit package prefix. A single-package Target may resolve Control
Root and Package Root `.` to the same physical directory, but their distinct
semantic roots remain visible for authorization, planning, ownership evidence,
and future validation.

## Consequences

All Output paths normalize only after their semantic base is resolved. Global
overlap detection compares the resulting Control-Root-relative locations, so
different semantic roots do not hide physical conflicts. New target namespaces
require an architectural decision instead of bypassing containment through a
generic relative-path capability. Plans and execution hashes preserve the root
selection even when two roots resolve to the same physical directory.
