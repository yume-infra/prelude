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
