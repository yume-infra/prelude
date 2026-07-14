import { NodeServices } from '@effect/platform-node'
import { describe, expect, it, layer } from '@effect/vitest'
import { Effect, FileSystem, Path } from 'effect'

import { discoverControlRoot, encodeIntegrationId, loadPreludeConfig } from '../src/config.js'

describe('V2 Control Root and Integration configuration', () => {
  layer(NodeServices.layer)((it) => {
    it.effect('discovers the nearest ancestor .prelude/config.jsonc', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const outer = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-control-' })
      const inner = path.join(outer, 'workspace')
      const packageRoot = path.join(inner, 'packages/api/src')
      yield* fs.makeDirectory(path.join(outer, '.prelude'), { recursive: true })
      yield* fs.makeDirectory(path.join(inner, '.prelude'), { recursive: true })
      yield* fs.makeDirectory(packageRoot, { recursive: true })
      yield* fs.writeFileString(path.join(outer, '.prelude/config.jsonc'), '{ "schemaVersion": 2, "integrations": [] }')
      yield* fs.writeFileString(path.join(inner, '.prelude/config.jsonc'), '{ "schemaVersion": 2, "integrations": [] }')

      const discovered = yield* discoverControlRoot(packageRoot)
      expect(discovered).toBe(yield* fs.realPath(inner))
    })))

    it.effect('accepts nonempty unique packageRoots and normalizes their order', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-config-' })
      yield* fs.makeDirectory(path.join(root, '.prelude'))
      yield* fs.writeFileString(path.join(root, '.prelude/config.jsonc'), `{
      // V2 only
      "schemaVersion": 2,
      "integrations": [{
        "id": "effect:workspace",
        "module": "@synthetic/effect/prelude",
        "packageRoots": ["packages/web", ".", "packages/api"],
      }],
    }`)

      const config = yield* loadPreludeConfig(root)
      expect(config.integrations[0]?.packageRoots).toEqual(['.', 'packages/api', 'packages/web'])
    })))

    it.effect('rejects released singular-root V1 config', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-config-v1-' })
      yield* fs.makeDirectory(path.join(root, '.prelude'))
      yield* fs.writeFileString(path.join(root, '.prelude/config.jsonc'), '{ "schemaVersion": 1, "integrations": [{ "id": "legacy", "module": "legacy/prelude", "packageRoot": "." }] }')

      expect((yield* Effect.exit(loadPreludeConfig(root)))._tag).toBe('Failure')
    })))
  })

  it.effect('generates stable reversible cross-platform workspace segments', () => Effect.sync(() => {
    expect(encodeIntegrationId('effect:workspace')).toBe('i-effect%3Aworkspace')
    expect(encodeIntegrationId('effect/workspace')).toBe('i-effect%2Fworkspace')
    expect(decodeURIComponent(encodeIntegrationId('effect/workspace').slice(2))).toBe('effect/workspace')
  }))
})
