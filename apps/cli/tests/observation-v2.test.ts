import { NodeServices } from '@effect/platform-node'
import { describe, expect, layer } from '@effect/vitest'
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
  layer(NodeServices.layer)((it) => {
    it.effect('observes Control Root, Integration Workspace, and approved Package Root data', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-observation-' })
      const integrationWorkspace = '.prelude/effect%3Aworkspace'
      yield* fs.makeDirectory(path.join(root, integrationWorkspace), { recursive: true })
      yield* fs.makeDirectory(path.join(root, 'packages/app'), { recursive: true })
      yield* fs.writeFileString(path.join(root, 'control.txt'), 'control')
      yield* fs.writeFileString(path.join(root, integrationWorkspace, 'state.txt'), 'integration')
      yield* fs.writeFileString(path.join(root, 'packages/app/config.json'), '{"scope":"package"}')
      yield* fs.writeFileString(path.join(root, 'packages/app/package.json'), '{"name":"app","private":true}')

      const observed = yield* withReadonlyTarget(root, integrationWorkspace, ['packages/app'], target => Effect.all({
        control: target.readText({ root: 'ControlRoot', path: 'control.txt' }),
        integration: target.readText({ root: 'IntegrationWorkspace', path: 'state.txt' }),
        package: target.readText({ root: 'PackageRoot', packageRoot: 'packages/app', path: 'config.json' }),
        manifest: target.readPackageManifest('packages/app'),
      }))

      expect(observed).toEqual({ control: 'control', integration: 'integration', package: '{"scope":"package"}', manifest: { name: 'app', private: true } })
    })))

    it.effect('rejects a Package Root that is not approved for the Integration', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-observation-membership-' })
      yield* fs.makeDirectory(path.join(root, 'packages/unapproved'), { recursive: true })
      yield* fs.writeFileString(path.join(root, 'packages/unapproved/package.json'), '{"name":"unapproved"}')

      const error = yield* withReadonlyTarget(root, '.prelude/observation', ['packages/approved'], target => Effect.flip(target.readPackageManifest('packages/unapproved')))
      expect(error._tag).toBe('TargetObservationError')
      expect(error.locator).toEqual({ root: 'PackageRoot', packageRoot: 'packages/unapproved', path: 'package.json' })
      expect(error.message).toContain('not approved')
    })))

    it.effect('rejects a lexical escape from each tagged root', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-observation-escape-' })
      yield* fs.makeDirectory(path.join(root, '.prelude/observation'), { recursive: true })
      yield* fs.makeDirectory(path.join(root, 'packages/app'), { recursive: true })

      const exits = yield* withReadonlyTarget(root, '.prelude/observation', ['packages/app'], target => Effect.all([
        Effect.exit(target.readText({ root: 'ControlRoot', path: '../outside.txt' })),
        Effect.exit(target.readText({ root: 'IntegrationWorkspace', path: '../../outside.txt' })),
        Effect.exit(target.readText({ root: 'PackageRoot', packageRoot: 'packages/app', path: '../../outside.txt' })),
      ]))
      expect(exits.map(exit => exit._tag)).toEqual(['Failure', 'Failure', 'Failure'])
    })))

    it.effect('never follows a symbolic-link ancestor or final observation path', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-observation-symlink-' })
      const outside = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-observation-outside-' })
      yield* fs.writeFileString(path.join(outside, 'secret.txt'), 'outside')
      yield* fs.symlink(outside, path.join(root, 'linked-directory'))
      yield* fs.symlink(path.join(outside, 'secret.txt'), path.join(root, 'linked-file.txt'))

      const exits = yield* withReadonlyTarget(root, '.prelude/observation', ['.'], target => Effect.all([
        Effect.exit(target.readText({ root: 'ControlRoot', path: 'linked-directory/secret.txt' })),
        Effect.exit(target.readText({ root: 'ControlRoot', path: 'linked-file.txt' })),
      ]))
      expect(exits.map(exit => exit._tag)).toEqual(['Failure', 'Failure'])
    })))

    it.effect('observes Target-owned feedback through its Integration Workspace locator', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-observation-feedback-' })
      const integrationWorkspace = '.prelude/effect%3Aworkspace'
      yield* fs.makeDirectory(path.join(root, integrationWorkspace, 'feedback'), { recursive: true })
      yield* fs.writeFileString(path.join(root, integrationWorkspace, 'feedback/notes.md'), 'target evidence')

      const feedback = yield* withReadonlyTarget(root, integrationWorkspace, ['.'], target => target.readText({ root: 'IntegrationWorkspace', path: 'feedback/notes.md' }))
      expect(feedback).toBe('target evidence')
    })))
  })
})
