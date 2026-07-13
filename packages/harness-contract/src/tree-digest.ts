import { createHash } from 'node:crypto'

import { Schema } from 'effect'

import { RootRelativePathSchema, Sha256DigestSchema } from './primitives.js'

export const TREE_DIGEST_ALGORITHM = 'prelude-tree-sha256-v1' as const
export const SYMBOLIC_LINK_MODE = 0o777 as const

const FileModeSchema = Schema.Finite.pipe(
  Schema.check(
    Schema.isInt(),
    Schema.isBetween({ minimum: 0, maximum: 0o777 }),
  ),
)

export function isSafeRelativeSymlink(path: string, target: string): boolean {
  if (target.length === 0 || target.startsWith('/') || target.includes('\\') || target.includes('\0') || /^[a-z]:/i.test(target))
    return false

  const resolved = path.split('/').slice(0, -1)
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.')
      continue
    if (segment === '..') {
      if (resolved.length === 0)
        return false
      resolved.pop()
    }
    else {
      resolved.push(segment)
    }
  }
  return true
}

const SymlinkTargetSchema = Schema.String.pipe(
  Schema.check(Schema.makeFilter(
    target => target.length > 0 && !target.includes('\0'),
    { expected: 'nonempty POSIX readlink text without null bytes' },
  )),
)

export const TreeDigestEntrySchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal('directory'),
    path: RootRelativePathSchema,
    mode: FileModeSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal('file'),
    path: RootRelativePathSchema,
    mode: FileModeSchema,
    hash: Sha256DigestSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal('symbolicLink'),
    path: RootRelativePathSchema,
    mode: Schema.Literal(SYMBOLIC_LINK_MODE),
    target: SymlinkTargetSchema,
  }).pipe(
    Schema.check(Schema.makeFilter(
      entry => isSafeRelativeSymlink(entry.path, entry.target),
      { expected: 'a safe relative symlink lexically contained in the tree root' },
    )),
  ),
])

export type TreeDigestEntry = Schema.Schema.Type<typeof TreeDigestEntrySchema>

export const TreeDigestSnapshotSchema = Schema.Struct({
  rootKind: Schema.Literals(['missing', 'directory', 'file']),
  entries: Schema.Array(TreeDigestEntrySchema),
}).pipe(
  Schema.check(Schema.makeFilter(
    (snapshot) => {
      const paths = snapshot.entries.map(entry => entry.path)
      if (new Set(paths).size !== paths.length)
        return false
      if (snapshot.rootKind === 'missing')
        return snapshot.entries.length === 0
      if (snapshot.rootKind === 'file')
        return snapshot.entries.length === 1 && snapshot.entries[0]?.kind === 'file' && snapshot.entries[0].path === '.'
      return snapshot.entries.every(entry => entry.path !== '.')
    },
    { expected: 'a canonical tree snapshot with unique paths and a matching root kind' },
  )),
)

export type TreeDigestSnapshot = Schema.Schema.Type<typeof TreeDigestSnapshotSchema>

export const decodeTreeDigestSnapshot = Schema.decodeUnknownSync(TreeDigestSnapshotSchema, {
  errors: 'all',
  onExcessProperty: 'error',
})

function comparePath(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export function canonicalTreeDigestPayload(snapshot: TreeDigestSnapshot): string {
  const entries = [...snapshot.entries]
    .sort((left, right) => comparePath(left.path, right.path))
    .map(entry => entry.kind === 'file'
      ? { kind: entry.kind, path: entry.path, mode: entry.mode, hash: entry.hash }
      : entry.kind === 'symbolicLink'
        ? { kind: entry.kind, path: entry.path, mode: entry.mode, target: entry.target }
        : { kind: entry.kind, path: entry.path, mode: entry.mode })

  return JSON.stringify({
    algorithm: TREE_DIGEST_ALGORITHM,
    rootKind: snapshot.rootKind,
    entries,
  })
}

export function canonicalTreeDigest(snapshot: TreeDigestSnapshot): string {
  return createHash('sha256').update(canonicalTreeDigestPayload(snapshot), 'utf8').digest('hex')
}
