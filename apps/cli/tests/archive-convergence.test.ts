import type { PinnedReferenceTree } from '@sayoriqwq/prelude-contract'

import { chmod, lstat, mkdir, mkdtemp, readdir, readFile, readlink, symlink, truncate, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { NodeServices } from '@effect/platform-node'
import { describe, expect, it } from '@effect/vitest'
import {
  CANONICAL_TREE_ARCHIVE_FORMAT,
  CANONICAL_TREE_ARCHIVE_LIMITS,
  decodeCanonicalTreeArchive,
  encodeCanonicalTreeArchive,
} from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'

import { loadPinnedReferenceTreeArchive } from '../src/convergence.js'
import { replaceTreeFromArchive, scanTree } from '../src/filesystem.js'

const text = (value: string) => new TextEncoder().encode(value)
const materializedSymlinkMode = process.platform === 'darwin' ? 0o755 : 0o777

function fixtureArchive() {
  return encodeCanonicalTreeArchive([
    { kind: 'file', path: 'AGENTS.md', mode: 0o644, bytes: text('source guidance\n') },
    { kind: 'symbolicLink', path: 'CLAUDE.md', mode: materializedSymlinkMode, target: 'AGENTS.md' },
    { kind: 'directory', path: 'empty', mode: 0o750 },
    { kind: 'file', path: '.gitmodules', mode: 0o644, bytes: text('[submodule "opaque"]\n') },
  ])
}

function declaration(treeDigest: string): PinnedReferenceTree {
  return {
    kind: 'PinnedReferenceTree',
    id: 'source-reference',
    archive: { path: 'assets/source.prelude-tree', format: CANONICAL_TREE_ARCHIVE_FORMAT },
    locator: { root: 'IntegrationWorkspace', path: 'repos/source' },
    provenance: {
      sourceUrl: 'https://example.invalid/outer.git',
      revision: 'outer-revision',
      treeDigest,
    },
    referenceOnly: true,
  }
}

describe('PinnedReferenceTree canonical archive convergence', () => {
  it.effect('loads an ordinary Artifact archive and verifies its complete logical digest', () => Effect.gen(function* () {
    const artifactRoot = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-archive-artifact-')))
    yield* Effect.promise(() => mkdir(join(artifactRoot, 'assets')))
    const encoded = fixtureArchive()
    yield* Effect.promise(() => writeFile(join(artifactRoot, 'assets/source.prelude-tree'), encoded.bytes))

    const loaded = yield* loadPinnedReferenceTreeArchive(artifactRoot, declaration(encoded.treeDigest))
    expect(loaded.treeDigest).toBe(encoded.treeDigest)
    expect(loaded.entries.map(entry => entry.path)).toEqual(['.gitmodules', 'AGENTS.md', 'CLAUDE.md', 'empty'])
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('rejects a symlink in place of the declared ordinary Artifact archive file', () => Effect.gen(function* () {
    const artifactRoot = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-archive-link-')))
    yield* Effect.promise(() => mkdir(join(artifactRoot, 'assets')))
    const encoded = fixtureArchive()
    yield* Effect.promise(() => writeFile(join(artifactRoot, 'actual.prelude-tree'), encoded.bytes))
    yield* Effect.promise(() => symlink('../actual.prelude-tree', join(artifactRoot, 'assets/source.prelude-tree')))

    const exit = yield* Effect.exit(loadPinnedReferenceTreeArchive(artifactRoot, declaration(encoded.treeDigest)))
    expect(exit._tag).toBe('Failure')
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('rejects an oversized ordinary archive before reading its payload', () => Effect.gen(function* () {
    const artifactRoot = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-archive-size-')))
    yield* Effect.promise(() => mkdir(join(artifactRoot, 'assets')))
    const archivePath = join(artifactRoot, 'assets/source.prelude-tree')
    yield* Effect.promise(() => writeFile(archivePath, ''))
    yield* Effect.promise(() => truncate(archivePath, CANONICAL_TREE_ARCHIVE_LIMITS.maxArchiveBytes + 1))

    const exit = yield* Effect.exit(loadPinnedReferenceTreeArchive(
      artifactRoot,
      declaration('0'.repeat(64)),
    ))
    expect(exit._tag).toBe('Failure')
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('atomically materializes exact files, empty directories, modes, and safe links without metadata', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-archive-target-')))
    const target = join(root, 'repos')
    yield* Effect.promise(() => mkdir(target))
    yield* Effect.promise(() => writeFile(join(target, 'target-note.txt'), 'replace me'))
    const encoded = fixtureArchive()
    const archive = decodeCanonicalTreeArchive(encoded.bytes)

    yield* replaceTreeFromArchive(archive, target, 'archive-output', archive.treeDigest)

    expect(yield* Effect.promise(() => readFile(join(target, 'AGENTS.md'), 'utf8'))).toBe('source guidance\n')
    expect(yield* Effect.promise(() => readlink(join(target, 'CLAUDE.md')))).toBe('AGENTS.md')
    expect((yield* Effect.promise(() => lstat(join(target, 'AGENTS.md')))).mode & 0o777).toBe(0o644)
    expect((yield* Effect.promise(() => lstat(join(target, 'empty')))).mode & 0o777).toBe(0o750)
    expect(yield* Effect.promise(() => readdir(join(target, 'empty')))).toEqual([])
    expect(yield* Effect.promise(() => readdir(target))).toEqual(['.gitmodules', 'AGENTS.md', 'CLAUDE.md', 'empty'])
    expect((yield* scanTree(target, 'planning', { allowSafeSymlinks: true })).digest).toBe(archive.treeDigest)
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('keeps the previous complete tree when the approved archive digest is wrong', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-archive-mismatch-')))
    const target = join(root, 'repos')
    yield* Effect.promise(() => mkdir(target))
    yield* Effect.promise(() => writeFile(join(target, 'current.txt'), 'current'))
    yield* Effect.promise(() => chmod(join(target, 'current.txt'), 0o644))
    const archive = decodeCanonicalTreeArchive(fixtureArchive().bytes)

    const exit = yield* Effect.exit(replaceTreeFromArchive(archive, target, 'archive-mismatch', 'f'.repeat(64)))
    expect(exit._tag).toBe('Failure')
    expect(yield* Effect.promise(() => readFile(join(target, 'current.txt'), 'utf8'))).toBe('current')
    expect((yield* Effect.promise(() => readdir(root))).some(name => name.includes('prelude-stage'))).toBe(false)
  }).pipe(Effect.provide(NodeServices.layer)))
})
