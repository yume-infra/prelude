import { chmod, link, mkdir, mkdtemp, readdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { NodeServices } from '@effect/platform-node'
import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { assertTargetWritePath, publishFile, replaceTree, scanTree } from '../src/filesystem.js'

describe('Target confinement', () => {
  it.effect('rejects a bounded output whose existing parent is a symlink', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-confined-')))
    const outside = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-outside-')))
    yield* Effect.promise(() => symlink(outside, join(root, 'linked')))
    const exit = yield* Effect.exit(assertTargetWritePath(root, join(root, 'linked/config.json')))
    expect(exit._tag).toBe('Failure')
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('rejects a ManagedTree whose existing ancestor is a symlink', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-confined-')))
    const outside = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-outside-')))
    yield* Effect.promise(() => mkdir(join(root, 'packages'), { recursive: true }))
    yield* Effect.promise(() => symlink(outside, join(root, 'packages/app')))
    const exit = yield* Effect.exit(assertTargetWritePath(root, join(root, 'packages/app/managed/tree')))
    expect(exit._tag).toBe('Failure')
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('rejects a ManagedTree sourceRoot symlink and symlinks inside its tree', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-artifact-')))
    const outside = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-artifact-outside-')))
    yield* Effect.promise(() => writeFile(join(outside, 'file.txt'), 'outside'))
    yield* Effect.promise(() => symlink(outside, join(root, 'source-link')))
    expect((yield* Effect.exit(scanTree(join(root, 'source-link'), 'planning')))._tag).toBe('Failure')

    const source = join(root, 'source')
    yield* Effect.promise(() => mkdir(source))
    yield* Effect.promise(() => symlink(join(outside, 'file.txt'), join(source, 'file-link')))
    yield* Effect.promise(() => symlink(outside, join(source, 'directory-link')))
    expect((yield* Effect.exit(scanTree(source, 'planning')))._tag).toBe('Failure')
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('rejects Target hardlinks', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-hardlink-')))
    yield* Effect.promise(() => writeFile(join(root, 'source.txt'), 'same bytes'))
    yield* Effect.promise(() => link(join(root, 'source.txt'), join(root, 'linked.txt')))
    const exit = yield* Effect.exit(scanTree(root, 'planning'))
    expect(exit._tag).toBe('Failure')
    const boundedExit = yield* Effect.exit(assertTargetWritePath(root, join(root, 'linked.txt')))
    expect(boundedExit._tag).toBe('Failure')
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('keeps the target and cleans staging after a ManagedTree digest mismatch', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-stage-')))
    const source = join(root, 'source')
    const target = join(root, 'target')
    yield* Effect.promise(() => mkdir(source))
    yield* Effect.promise(() => mkdir(target))
    yield* Effect.promise(() => writeFile(join(source, 'next.txt'), 'next'))
    yield* Effect.promise(() => writeFile(join(target, 'current.txt'), 'current'))
    const exit = yield* Effect.exit(replaceTree(source, target, 'digest-test', 'not-approved'))
    expect(exit._tag).toBe('Failure')
    expect(yield* Effect.promise(() => readFile(join(target, 'current.txt'), 'utf8'))).toBe('current')
    expect((yield* Effect.promise(() => readdir(root))).some(name => name.includes('prelude-stage'))).toBe(false)
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('cleans staging after copy and rename failures', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-stage-failures-')))
    const target = join(root, 'target')
    yield* Effect.promise(() => mkdir(target))
    const copyExit = yield* Effect.exit(replaceTree(join(root, 'missing-source'), target, 'copy-failure', 'digest'))
    expect(copyExit._tag).toBe('Failure')
    const renameExit = yield* Effect.exit(publishFile(target, 'content', 'rename-failure'))
    expect(renameExit._tag).toBe('Failure')
    expect((yield* Effect.promise(() => readdir(root))).some(name => name.includes('prelude-stage'))).toBe(false)
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('leaves no staged file after a write failure', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-write-failure-')))
    yield* Effect.promise(() => chmod(root, 0o500))
    const exit = yield* Effect.exit(publishFile(join(root, 'output.json'), '{}', 'write-failure'))
    yield* Effect.promise(() => chmod(root, 0o700))
    expect(exit._tag).toBe('Failure')
    expect((yield* Effect.promise(() => readdir(root))).some(name => name.includes('prelude-stage'))).toBe(false)
  }).pipe(Effect.provide(NodeServices.layer)))
})
