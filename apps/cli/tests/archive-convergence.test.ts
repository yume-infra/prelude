import type { PinnedReferenceTree } from '@sayoriqwq/prelude-contract'

import { NodeServices } from '@effect/platform-node'
import { describe, expect, layer } from '@effect/vitest'
import {
  CANONICAL_TREE_ARCHIVE_FORMAT,
  CANONICAL_TREE_ARCHIVE_LIMITS,
  decodeCanonicalTreeArchive,
  encodeCanonicalTreeArchive,
  SYMBOLIC_LINK_MODE,
} from '@sayoriqwq/prelude-contract'
import { Effect, FileSystem, Path } from 'effect'

import { loadPinnedReferenceTreeArchive } from '../src/convergence.js'
import { replaceTreeFromArchive, scanTree } from '../src/filesystem.js'

const text = (value: string) => new TextEncoder().encode(value)
const materializedSymlinkMode = SYMBOLIC_LINK_MODE

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
  layer(NodeServices.layer)((it) => {
    it.effect('loads an ordinary Artifact archive and verifies its complete logical digest', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const artifactRoot = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-archive-artifact-' })
      yield* fs.makeDirectory(path.join(artifactRoot, 'assets'))
      const encoded = fixtureArchive()
      yield* fs.writeFile(path.join(artifactRoot, 'assets/source.prelude-tree'), encoded.bytes)

      const loaded = yield* loadPinnedReferenceTreeArchive(artifactRoot, declaration(encoded.treeDigest))
      expect(loaded.treeDigest).toBe(encoded.treeDigest)
      expect(loaded.entries.map(entry => entry.path)).toEqual(['.gitmodules', 'AGENTS.md', 'CLAUDE.md', 'empty'])
    })))

    it.effect('rejects a symlink in place of the declared ordinary Artifact archive file', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const artifactRoot = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-archive-link-' })
      yield* fs.makeDirectory(path.join(artifactRoot, 'assets'))
      const encoded = fixtureArchive()
      yield* fs.writeFile(path.join(artifactRoot, 'actual.prelude-tree'), encoded.bytes)
      yield* fs.symlink('../actual.prelude-tree', path.join(artifactRoot, 'assets/source.prelude-tree'))

      const exit = yield* Effect.exit(loadPinnedReferenceTreeArchive(artifactRoot, declaration(encoded.treeDigest)))
      expect(exit._tag).toBe('Failure')
    })))

    it.effect('rejects an oversized ordinary archive before reading its payload', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const artifactRoot = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-archive-size-' })
      yield* fs.makeDirectory(path.join(artifactRoot, 'assets'))
      const archivePath = path.join(artifactRoot, 'assets/source.prelude-tree')
      yield* fs.writeFileString(archivePath, '')
      yield* fs.truncate(archivePath, CANONICAL_TREE_ARCHIVE_LIMITS.maxArchiveBytes + 1)

      const exit = yield* Effect.exit(loadPinnedReferenceTreeArchive(
        artifactRoot,
        declaration('0'.repeat(64)),
      ))
      expect(exit._tag).toBe('Failure')
    })))

    it.effect('atomically materializes exact files, empty directories, modes, and safe links without metadata', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-archive-target-' })
      const target = path.join(root, 'repos')
      yield* fs.makeDirectory(target)
      yield* fs.writeFileString(path.join(target, 'target-note.txt'), 'replace me')
      const encoded = fixtureArchive()
      const archive = decodeCanonicalTreeArchive(encoded.bytes)

      yield* replaceTreeFromArchive(archive, target, 'archive-output', archive.treeDigest)

      expect(yield* fs.readFileString(path.join(target, 'AGENTS.md'))).toBe('source guidance\n')
      expect(yield* fs.readLink(path.join(target, 'CLAUDE.md'))).toBe('AGENTS.md')
      expect((yield* fs.stat(path.join(target, 'AGENTS.md'))).mode & 0o777).toBe(0o644)
      expect((yield* fs.stat(path.join(target, 'empty'))).mode & 0o777).toBe(0o750)
      expect(yield* fs.readDirectory(path.join(target, 'empty'))).toEqual([])
      expect(yield* fs.readDirectory(target)).toEqual(['.gitmodules', 'AGENTS.md', 'CLAUDE.md', 'empty'])
      expect((yield* scanTree(target, 'planning', { allowSafeSymlinks: true })).digest).toBe(archive.treeDigest)
    })))

    it.effect('keeps the previous complete tree when the approved archive digest is wrong', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-archive-mismatch-' })
      const target = path.join(root, 'repos')
      yield* fs.makeDirectory(target)
      yield* fs.writeFileString(path.join(target, 'current.txt'), 'current')
      yield* fs.chmod(path.join(target, 'current.txt'), 0o644)
      const archive = decodeCanonicalTreeArchive(fixtureArchive().bytes)

      const exit = yield* Effect.exit(replaceTreeFromArchive(archive, target, 'archive-mismatch', 'f'.repeat(64)))
      expect(exit._tag).toBe('Failure')
      expect(yield* fs.readFileString(path.join(target, 'current.txt'))).toBe('current')
      expect((yield* fs.readDirectory(root)).some(name => name.includes('prelude-stage'))).toBe(false)
    })))
  })
})
