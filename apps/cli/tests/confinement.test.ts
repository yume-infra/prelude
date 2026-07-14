import { NodeServices } from '@effect/platform-node'
import { describe, expect, layer } from '@effect/vitest'
import { SYMBOLIC_LINK_MODE } from '@sayoriqwq/prelude-contract'
import { Effect, FileSystem, Path } from 'effect'

import { assertTargetWritePath, publishFile, replaceTree, scanTree } from '../src/filesystem.js'

describe('Target confinement', () => {
  layer(NodeServices.layer)((it) => {
    it.effect('rejects a bounded output whose existing parent is a symlink', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-confined-' })
      const outside = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-outside-' })
      yield* fs.symlink(outside, path.join(root, 'linked'))
      expect((yield* Effect.exit(assertTargetWritePath(root, path.join(root, 'linked/config.json'))))._tag).toBe('Failure')
    })))

    it.effect('rejects a ManagedTree whose existing ancestor is a symlink', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-confined-' })
      const outside = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-outside-' })
      yield* fs.makeDirectory(path.join(root, 'packages'), { recursive: true })
      yield* fs.symlink(outside, path.join(root, 'packages/app'))
      expect((yield* Effect.exit(assertTargetWritePath(root, path.join(root, 'packages/app/managed/tree'))))._tag).toBe('Failure')
    })))

    it.effect('rejects a ManagedTree sourceRoot symlink and symlinks inside its tree', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-artifact-' })
      const outside = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-artifact-outside-' })
      yield* fs.writeFileString(path.join(outside, 'file.txt'), 'outside')
      yield* fs.symlink(outside, path.join(root, 'source-link'))
      expect((yield* Effect.exit(scanTree(path.join(root, 'source-link'), 'planning')))._tag).toBe('Failure')

      const source = path.join(root, 'source')
      yield* fs.makeDirectory(source)
      yield* fs.symlink(path.join(outside, 'file.txt'), path.join(source, 'file-link'))
      yield* fs.symlink(outside, path.join(source, 'directory-link'))
      expect((yield* Effect.exit(scanTree(source, 'planning')))._tag).toBe('Failure')
    })))

    it.effect('digests safe relative PinnedReferenceTree target symlinks without dereferencing', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-pinned-link-' })
      const source = path.join(root, 'source')
      yield* fs.makeDirectory(source)
      yield* fs.writeFileString(path.join(source, 'AGENTS.md'), 'source guidance')
      yield* fs.symlink('AGENTS.md', path.join(source, 'CLAUDE.md'))
      const snapshot = yield* scanTree(source, 'planning', { allowSafeSymlinks: true })
      expect(snapshot.entries).toContainEqual({ path: 'CLAUDE.md', kind: 'symbolicLink', mode: SYMBOLIC_LINK_MODE, target: 'AGENTS.md' })
    })))

    it.effect('rejects a PinnedReferenceTree symlink that lexically escapes the complete tree', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-pinned-escape-' })
      const source = path.join(root, 'source')
      yield* fs.makeDirectory(source)
      yield* fs.symlink('../outside', path.join(source, 'escape'))
      expect((yield* Effect.exit(scanTree(source, 'planning', { allowSafeSymlinks: true })))._tag).toBe('Failure')
    })))

    it.effect('rejects Target hardlinks', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-hardlink-' })
      yield* fs.writeFileString(path.join(root, 'source.txt'), 'same bytes')
      yield* fs.link(path.join(root, 'source.txt'), path.join(root, 'linked.txt'))
      expect((yield* Effect.exit(scanTree(root, 'planning')))._tag).toBe('Failure')
      expect((yield* Effect.exit(assertTargetWritePath(root, path.join(root, 'linked.txt'))))._tag).toBe('Failure')
    })))

    it.effect('keeps the target and cleans staging after a ManagedTree digest mismatch', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-stage-' })
      const source = path.join(root, 'source')
      const target = path.join(root, 'target')
      yield* fs.makeDirectory(source)
      yield* fs.makeDirectory(target)
      yield* fs.writeFileString(path.join(source, 'next.txt'), 'next')
      yield* fs.writeFileString(path.join(target, 'current.txt'), 'current')
      expect((yield* Effect.exit(replaceTree(source, target, 'digest-test', 'not-approved')))._tag).toBe('Failure')
      expect(yield* fs.readFileString(path.join(target, 'current.txt'))).toBe('current')
      expect((yield* fs.readDirectory(root)).some(name => name.includes('prelude-stage'))).toBe(false)
    })))

    it.effect('cleans staging after copy and rename failures', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-stage-failures-' })
      const target = path.join(root, 'target')
      yield* fs.makeDirectory(target)
      expect((yield* Effect.exit(replaceTree(path.join(root, 'missing-source'), target, 'copy-failure', 'digest')))._tag).toBe('Failure')
      expect((yield* Effect.exit(publishFile(target, 'content', 'rename-failure')))._tag).toBe('Failure')
      expect((yield* fs.readDirectory(root)).some(name => name.includes('prelude-stage'))).toBe(false)
    })))

    it.effect('leaves no staged file after a write failure', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-write-failure-' })
      yield* fs.chmod(root, 0o500)
      const exit = yield* Effect.exit(publishFile(path.join(root, 'output.json'), '{}', 'write-failure'))
      yield* fs.chmod(root, 0o700)
      expect(exit._tag).toBe('Failure')
      expect((yield* fs.readDirectory(root)).some(name => name.includes('prelude-stage'))).toBe(false)
    })))
  })
})
