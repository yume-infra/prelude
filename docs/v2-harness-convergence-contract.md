---
audience: [agent, human]
authors: [codex]
purpose: Define the active Prelude V2 successor Contract, host lifecycle, and Gate 1 evidence.
status: active
updated: 2026-07-13
---

# Prelude V2 Harness Convergence Contract

## Authority And Cutover

This document is the active successor authority where released V1 documents
conflict with V2. V2 is a breaking cutover: the host accepts only V2 config,
Module, locator, Plan, and execution-hash shapes. It does not dual-load V1 or
silently adapt a released V1 Harness. The published V1 packages remain the
historical compatibility boundary; Psychogram migration is separate work.

Prelude remains a domain-blind, stateless convergence host. It does not regain
provider discovery, create/init/remove, manifests, receipts, target-local
dispatchers, durable journals, rollback, or Target Git operations.

## Control Root And Integrations

The nearest ancestor containing `.prelude/config.jsonc` is the Control Root.
The V2 config has `schemaVersion: 2`. Each Integration declares:

- a stable `id`;
- one bare installed Harness Module export;
- a nonempty, unique collection of at most 64 explicit `packageRoots`.

Prelude does not discover or silently claim workspace packages. Package Roots
are normalized, confined beneath the Control Root, must contain `package.json`,
and must not traverse symbolic links.

Each Integration owns `.prelude/<encoded-id>/`, where the exact Prelude-owned
encoding is `i-` followed by JavaScript `encodeURIComponent(id)`. The direct
sibling zones are:

- `managed/`, converged from Harness Outputs;
- `repos/`, converged from Harness Pinned Reference Outputs;
- `feedback/`, Target-owned evidence that may be observed but is never an
  Output and is untouched by apply and upgrade.

Host validation rejects every physical Output alias that enters or contains
any active Integration's feedback zone, including aliases declared from the
Control Root or a Package Root.

## Planning Boundary

One first-party trusted Harness Module exports one named `harnessModule` with
protocol version 2 and required feature ids. Its `plan(context)` is read-only
and returns Contract plain data only:

```text
outputs
requirements
issues
checks
```

Planning runs once per Integration, not once per selected Package Root. A
Harness therefore declares Integration-scoped knowledge once and emits any
package-scoped JSON policy, Requirements, and Checks explicitly for the
selected roots that need them. Prelude does not infer Harness domain policy.

The context identifies the exact installed Artifact and gives two read-only
views:

- confined Artifact assets;
- tagged Target observations rooted at the Control Root, this Integration
  Workspace, or an approved Package Root.

Every observation path is normalized and contained. Reads use no-follow
`lstat`/`readlink` behavior, reject a symbolic-link path or ancestor, and
validate Package Root membership. Integration `feedback/**` may be observed.
There is no second observation allowlist. Observed bytes are not automatically
hashed; only declarations and digests returned by the Module enter the Plan.

## Output Locators And Capabilities

Every V2 Output has an explicit tagged target locator:

```text
ControlRoot(path)
IntegrationWorkspace(path)
PackageRoot(packageRoot, path)
```

Prelude resolves all locators to normalized Control-Root-relative physical
paths before global conflict detection. Different semantic roots never hide a
physical overlap.

V2 keeps the four released capabilities and their safety properties:

- `ManagedTree`: exact authority over one complete Artifact directory;
- `ManagedBlock`: exact bounded block authority in a shared text file;
- `JsonValue`: one canonical JSON/JSONC pointer;
- `JsonKeyedItem`: one stable-key JSON/JSONC collection item.

ManagedTree remains symlink-forbidden. Tree sources must be complete
directories inside the selected Artifact. Target trees reject symlinks,
hardlinks, special files, path escapes, and unobserved copied content.

V2 adds `PinnedReferenceTree`:

- Artifact-relative ordinary-file archive descriptor `{ path, format }` using
  `prelude-canonical-tree-archive-v1`;
- Integration Workspace locator;
- `referenceOnly: true`;
- immutable provenance containing source URL, revision, and SHA-256 logical
  tree digest;
- complete Harness-owned replacement semantics.

Target edits below a pinned tree are Reference Drift. Plan exposes that drift;
after normal exact-hash approval, apply replaces the whole tree. It does not
merge, preserve, or block solely because the pinned tree has local edits.
Target-authored evidence belongs in `feedback/**`.

Prelude never fetches, pulls, updates, or checks out Git. The Harness
maintenance/build side owns Source Pins and packs the verified snapshot into
one canonical archive ordinary file. Prelude does not trust an installed
Artifact directory to preserve source filesystem semantics.

Source Pin provenance intentionally covers one repository layer. Gitlinks are
opaque boundaries: the Harness archive may include ordinary outer-repository
files such as `.gitmodules`, but it omits gitlink entries and does not recurse
into their repositories. Prelude validates and materializes only the declared
logical archive and does not interpret Git, fetch nested sources, synthesize a
checkout, or inject provenance metadata into the Target tree.

## Canonical Tree Digest

The shared Contract exports `prelude-tree-sha256-v1`. The logical tree digest is SHA-256 of
the UTF-8 bytes of compact JSON with this framing and key order:

```text
algorithm, rootKind, entries
directory entry:   kind, path, mode
file entry:        kind, path, mode, hash
symbolicLink entry: kind, path, mode, target
```

Entries use deterministic JavaScript string path order. File hashes are
SHA-256 of exact bytes. Empty directories and POSIX permission modes are part
of the snapshot. Symbolic-link entries retain the `mode` field for stable
framing, but its only canonical value is `0777`: POSIX hosts expose symlink
permission bits differently and do not provide a portable lchmod operation.

Pinned trees may contain safe relative symbolic links. The link target is the
exact POSIX `readlink` text. Absolute, drive-qualified, backslash-containing,
NUL-containing, or lexically root-escaping targets are rejected. Scanning uses
no-follow `lstat` and `readlink`; host scans record symlinks with canonical
mode `0777`, and staging recreates the exact target text before recomputing
the complete staged digest. ManagedTree does not opt in. Prelude never
dereferences, drops, or translates a link.

The ordinary-file archive begins with the exact UTF-8 magic
`prelude-canonical-tree-archive-v1\n`, an unsigned 8-byte big-endian canonical
JSON header length, the compact canonical JSON header, and exact file bytes in
deterministic entry order. Header file sizes frame payloads; every file hash and
the complete logical tree digest are recomputed. Any trailing byte is rejected.

The archive represents only directory, file, and symbolicLink entries. It
requires explicit directory parents and rejects path escape, exact or portable
case/Unicode collisions, hardlinks, devices, FIFO, sockets, other special
entries, unsafe links, invalid modes/hashes/UTF-8/framing, and limit overflow.
Limits are 1 GiB archive, 64 MiB header, 512 MiB per file, 250,000 entries, and
4 KiB per path or link target.

## Package Requirements And Approved Selection

A Requirement identifies an approved Package Root, direct package name,
manifest section, and compatible range. A transitive package is insufficient.

Prelude core never runs `pnpm add <range>` and never resolves versions during
apply. Missing or incompatible manifest/lock selection is a blocking repair
path. A Prelude-owned repair skill:

1. resolves in an isolated temporary copy with the same repo-relative inputs;
2. presents the complete exact `package.json` and `pnpm-lock.yaml` diff;
3. writes those exact bytes only after explicit user approval;
4. replans from the real Target.

The Plan and execution hash bind the exact manifest and lockfile byte hashes.
When the approved selection is compatible but not installed, apply may run
only `pnpm install --frozen-lockfile --force`. `--force` makes pnpm rematerialize
the affected approved Package Roots even when pnpm's modules state still claims
the install is current. Prelude preflights an exact path selector for every root
whose installation evidence is missing, fails closed if a selector matches zero
or any different project, and then installs only that selector set. An
unselected workspace package is never materialized as a side effect. The child
is noninteractive, has inherited pnpm directory/filter context removed, keeps
CLI JSON stdout isolated, and has a bounded timeout; timeout or any nonzero exit
reports incomplete convergence. The complete frozen lockfile still prevents
dependency re-resolution. This applies to selected-package manifests and shared
workspace lock changes.

## Plan, Apply, And Output Atomicity

Prelude composes every Integration before writing. Plan schema version 2 and
execution-hash version 2 bind:

- config Integration ids, selected Package Roots, and encoded workspaces;
- exact Prelude/Harness Artifact selection identities;
- all Output, Requirement, Issue, and Check declarations;
- semantic locators and resolved physical paths;
- current and desired Output digests;
- Approved Package Selection manifest/lock hashes;
- blocking, conflict, and convergence lifecycle state.

Display-only evidence and redundant copies of the decoded Module Plan are not
hash inputs. Apply acquires the write boundary, fully replans, and refuses all
writes when the current hash differs from the approved hash.

Atomicity is per Output publication, not a durable transaction over the whole
Plan. ManagedTree and PinnedReferenceTree stage a complete tree and validate it
before replacement; a half-copied tree is never published. Bounded shared-file
changes are staged and renamed. If a later Output or frozen install fails,
earlier complete publications may remain. Prelude reports incomplete
convergence, does not run Checks, and does not claim completion. A fresh Plan
observes completed Outputs and resumes remaining work. There are no Plan-wide
backups, rollback, receipt, or crash-recovery lifecycle.

## Checks And Target Topology

Checks are ordinary no-shell argv commands scoped to approved Package Roots.
They run only after a fresh Plan proves the Integration fully converged.
Prelude executes every Check serially, aggregates failures, and replans after
commands.

Prelude does not discover TypeScript projects, infer which packages author
Effect, or implement Effect/tsgo policy. Effect Harness ships Target-aware
adaptation guidance. That skill inspects the real Target, selects and commits
`packageRoots`, proposes reviewable Target-owned TypeScript config changes,
and returns to plan/apply/check. The Harness declares canonical package-scoped
JSON policy and target Checks. Core claims materialization correctness, not
automatic coverage of every TypeScript project.

## Gate 1 Evidence

Unit tests or a Contract draft alone do not close Gate 1. Completion requires
packed Prelude, packed Contract, and packed Effect Harness Artifacts installed
into isolated single-package and pnpm-workspace Targets, followed by real:

```text
plan -> exact-hash apply -> fresh plan -> check
```

The acceptance must prove Integration-scoped `managed/` and `repos/` are each
delivered once, package policy/Requirements/Checks cover every selected root,
feedback survives apply and upgrade, pinned provenance and atomic replacement
hold, stale approval writes nothing, and no retired surface or Target Git
operation appears.

Gate 1 closed on 2026-07-14. `pnpm smoke:packed-effect` installed packed
Prelude `0.3.0`, Contract `0.2.0`, and Effect Harness `0.2.0` Artifacts into
isolated single-package and pnpm-workspace Targets and exercised the complete
plan, exact-hash apply, fresh plan, check, stale-hash, drift-repair, and
target-owned feedback lifecycle above. `pnpm smoke:installed` independently
proved multi-Harness composition, upgrades, failed installs, failed Checks,
and the absence of retired state surfaces. Safe-link logical identity and
ordinary-file archive transport are accepted successor behavior; nested
Source Pin provenance is not part of the product.
