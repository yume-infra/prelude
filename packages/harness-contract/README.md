# `@sayoriqwq/prelude-contract`

The shared, domain-blind contract between Prelude and Harness Modules.

The package exports Effect Schema codecs and schema-derived TypeScript types
for V2 Module descriptors, Module plans, explicit tagged locators, selected
Package Roots, all five Outputs, package Requirements, blocking Issues, Checks,
protocol negotiation, and the root-scoped read-only planning boundary.

It also exports the canonical `prelude-tree-sha256-v1` logical digest and the
`prelude-canonical-tree-archive-v1` ordinary-file transport. Archive helpers
preserve files, empty directories, modes, and safe relative symbolic links
without depending on npm or pnpm to transport filesystem links. Decoder limits,
canonical framing, path/collision checks, hashes, and trailing-byte rejection
are part of the public seam.

Pinned provenance binds one outer source URL, immutable revision, and complete
logical tree digest. Gitlinks are opaque and omitted from the archive; Prelude
does not interpret or recursively materialize them.

Reusable valid and invalid fixtures are available from
`@sayoriqwq/prelude-contract/conformance`.

## Canonical Tree Archive Protocol

This package is the single normative owner of the canonical tree archive wire
format and logical tree digest. A **Source Pin** is a producer-maintained,
Git-index-authoritative repository snapshot. A **publication** is the archive
ordinary file plus provenance JSON produced from one verified Source Pin. A
Harness **composer** selects a concrete publication and declares its Target
locator and reference-only policy as a `PinnedReferenceTree`. Prelude is the
**consumer** that validates and materializes that declaration after exact Plan
approval.

The ownership chain is deliberately split:

- [Partita](https://github.com/sayoriqwq/partita#pins) is the generic producer:
  it verifies a bounded Source Pin and encodes the publication through this
  package.
- [Effect Harness](https://github.com/sayoriqwq/effect-harness/blob/main/HARNESS.md)
  is a concrete composer: it selects Effect and tsgo pins and owns their Target
  delivery semantics.
- [Prelude](../../docs/v2-harness-convergence-contract.md#pinned-reference-trees)
  is the consumer and only Target mutation host.

### Logical tree digest

`prelude-tree-sha256-v1` is the lowercase hexadecimal SHA-256 of the UTF-8
bytes of compact JSON with exact top-level key order `algorithm`, `rootKind`,
`entries`. Entries are sorted by JavaScript string path order and use these
exact key orders:

```text
directory:    kind, path, mode
file:         kind, path, mode, hash
symbolicLink: kind, path, mode, target
```

File `hash` is lowercase hexadecimal SHA-256 of the exact file bytes. Empty
directories and integer POSIX modes from `0000` through `0777` are logical
content. A symbolic link records exact POSIX `readlink` text and always uses
canonical mode `0777`; its target must be relative and must remain lexically
inside the tree root. Absolute, drive-qualified, backslash-containing,
NUL-containing, empty, and root-escaping targets are invalid.

### Archive framing

`prelude-canonical-tree-archive-v1` has this exact byte layout:

```text
UTF-8 "prelude-canonical-tree-archive-v1\n"
unsigned 8-byte big-endian header length
compact canonical UTF-8 JSON header
file payload bytes in strict entry-path order
```

The header has exact keys `format`, `entries`. Directory and symbolic-link
entries use the logical keys above; file entries use `kind`, `path`, `mode`,
`size`, `hash`. Paths are normalized relative POSIX paths in strict ascending
order. Every non-root entry has an explicit directory parent. Exact duplicates
and portable NFC/case-folded collisions are invalid. Payload boundaries come
only from header file sizes; each file hash and the complete logical tree
digest are recomputed, and any missing, extra, trailing, or ambiguous byte is
rejected.

Only `directory`, `file`, and `symbolicLink` are archive entry kinds. Gitlinks
are opaque Source Pin boundaries and are omitted rather than followed or
encoded. Hardlinks, devices, FIFOs, sockets, unsupported kinds, invalid UTF-8,
non-canonical JSON/key order, invalid modes or hashes, unsafe links, and path
escapes are rejected.

Decoder limits are part of version 1: 1 GiB per archive, 64 MiB per header,
512 MiB per file, 250,000 entries, and 4 KiB for each path or link target.

### Compatibility

The two versioned identifiers and their accepted bytes are immutable released
Contract surfaces. An encoder must produce one canonical byte sequence for one
logical tree; a decoder accepts only that exact framing and recomputes all
hashes. Any change to framing, entry meaning, digest framing, canonicality,
limits, or safety semantics requires a new format or digest identifier and an
explicit Contract protocol evolution. Producers and consumers must not fork or
privately extend version 1.
