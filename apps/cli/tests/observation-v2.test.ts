import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { NodeServices } from '@effect/platform-node'
import { describe, expect, it } from '@effect/vitest'
import { Effect, FileSystem, Path } from 'effect'

import { readonlyTarget } from '../src/module-loader.js'

function withReadonlyTarget<A, E>(
  root: string,
  integrationWorkspace: string,
  packageRoots: ReadonlyArray<string>,
  use: (target: ReturnType<typeof readonlyTarget>) => Effect.Effect<A, E>,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    return yield* use(readonlyTarget(root, integrationWorkspace, packageRoots, fs, path))
  })
}

describe('V2 root-scoped Target observation', () => {
  it.effect('observes Control Root, Integration Workspace, and approved Package Root data', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-observation-')))
    const integrationWorkspace = '.prelude/i-effect%3Aworkspace'
    yield* Effect.promise(() => mkdir(join(root, integrationWorkspace), { recursive: true }))
    yield* Effect.promise(() => mkdir(join(root, 'packages/app'), { recursive: true }))
    yield* Effect.promise(() => writeFile(join(root, 'control.txt'), 'control'))
    yield* Effect.promise(() => writeFile(join(root, integrationWorkspace, 'state.txt'), 'integration'))
    yield* Effect.promise(() => writeFile(join(root, 'packages/app/config.json'), '{"scope":"package"}'))
    yield* Effect.promise(() => writeFile(join(root, 'packages/app/package.json'), '{"name":"app","private":true}'))

    const observed = yield* withReadonlyTarget(root, integrationWorkspace, ['packages/app'], target => Effect.all({
      control: target.readText({ root: 'ControlRoot', path: 'control.txt' }),
      integration: target.readText({ root: 'IntegrationWorkspace', path: 'state.txt' }),
      package: target.readText({ root: 'PackageRoot', packageRoot: 'packages/app', path: 'config.json' }),
      manifest: target.readPackageManifest('packages/app'),
    }))

    expect(observed).toEqual({
      control: 'control',
      integration: 'integration',
      package: '{"scope":"package"}',
      manifest: { name: 'app', private: true },
    })
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('rejects a Package Root that is not approved for the Integration', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-observation-membership-')))
    yield* Effect.promise(() => mkdir(join(root, 'packages/unapproved'), { recursive: true }))
    yield* Effect.promise(() => writeFile(join(root, 'packages/unapproved/package.json'), '{"name":"unapproved"}'))

    const error = yield* withReadonlyTarget(root, '.prelude/i-observation', ['packages/approved'], target => Effect.flip(
      target.readPackageManifest('packages/unapproved'),
    ))

    expect(error._tag).toBe('TargetObservationError')
    expect(error.locator).toEqual({ root: 'PackageRoot', packageRoot: 'packages/unapproved', path: 'package.json' })
    expect(error.message).toContain('not approved')
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('rejects a lexical escape from each tagged root', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-observation-escape-')))
    yield* Effect.promise(() => mkdir(join(root, '.prelude/i-observation'), { recursive: true }))
    yield* Effect.promise(() => mkdir(join(root, 'packages/app'), { recursive: true }))

    const exits = yield* withReadonlyTarget(root, '.prelude/i-observation', ['packages/app'], target => Effect.all([
      Effect.exit(target.readText({ root: 'ControlRoot', path: '../outside.txt' })),
      Effect.exit(target.readText({ root: 'IntegrationWorkspace', path: '../../outside.txt' })),
      Effect.exit(target.readText({ root: 'PackageRoot', packageRoot: 'packages/app', path: '../../outside.txt' })),
    ]))

    expect(exits.map(exit => exit._tag)).toEqual(['Failure', 'Failure', 'Failure'])
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('never follows a symbolic-link ancestor or final observation path', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-observation-symlink-')))
    const outside = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-observation-outside-')))
    yield* Effect.promise(() => writeFile(join(outside, 'secret.txt'), 'outside'))
    yield* Effect.promise(() => symlink(outside, join(root, 'linked-directory')))
    yield* Effect.promise(() => symlink(join(outside, 'secret.txt'), join(root, 'linked-file.txt')))

    const exits = yield* withReadonlyTarget(root, '.prelude/i-observation', ['.'], target => Effect.all([
      Effect.exit(target.readText({ root: 'ControlRoot', path: 'linked-directory/secret.txt' })),
      Effect.exit(target.readText({ root: 'ControlRoot', path: 'linked-file.txt' })),
    ]))

    expect(exits.map(exit => exit._tag)).toEqual(['Failure', 'Failure'])
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('observes Target-owned feedback through its Integration Workspace locator', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-observation-feedback-')))
    const integrationWorkspace = '.prelude/i-effect%3Aworkspace'
    yield* Effect.promise(() => mkdir(join(root, integrationWorkspace, 'feedback'), { recursive: true }))
    yield* Effect.promise(() => writeFile(join(root, integrationWorkspace, 'feedback/notes.md'), 'target evidence'))

    const feedback = yield* withReadonlyTarget(root, integrationWorkspace, ['.'], target => target.readText({
      root: 'IntegrationWorkspace',
      path: 'feedback/notes.md',
    }))

    expect(feedback).toBe('target evidence')
  }).pipe(Effect.provide(NodeServices.layer)))
})
