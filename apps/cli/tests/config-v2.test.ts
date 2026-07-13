import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { NodeServices } from '@effect/platform-node'
import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { discoverControlRoot, encodeIntegrationId, loadPreludeConfig } from '../src/config.js'

describe('V2 Control Root and Integration configuration', () => {
  it.effect('discovers the nearest ancestor .prelude/config.jsonc', () => Effect.gen(function* () {
    const outer = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-control-')))
    const inner = join(outer, 'workspace')
    const packageRoot = join(inner, 'packages/api/src')
    yield* Effect.promise(() => mkdir(join(outer, '.prelude'), { recursive: true }))
    yield* Effect.promise(() => mkdir(join(inner, '.prelude'), { recursive: true }))
    yield* Effect.promise(() => mkdir(packageRoot, { recursive: true }))
    yield* Effect.promise(() => writeFile(join(outer, '.prelude/config.jsonc'), '{ "schemaVersion": 2, "integrations": [] }'))
    yield* Effect.promise(() => writeFile(join(inner, '.prelude/config.jsonc'), '{ "schemaVersion": 2, "integrations": [] }'))

    const discovered = yield* discoverControlRoot(packageRoot)
    expect(discovered).toBe(yield* Effect.promise(() => realpath(inner)))
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('accepts nonempty unique packageRoots and normalizes their order', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-config-')))
    yield* Effect.promise(() => mkdir(join(root, '.prelude')))
    yield* Effect.promise(() => writeFile(join(root, '.prelude/config.jsonc'), `{
      // V2 only
      "schemaVersion": 2,
      "integrations": [{
        "id": "effect:workspace",
        "module": "@synthetic/effect/prelude",
        "packageRoots": ["packages/web", ".", "packages/api"],
      }],
    }`))

    const config = yield* loadPreludeConfig(root)
    expect(config.integrations[0]?.packageRoots).toEqual(['.', 'packages/api', 'packages/web'])
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('rejects released singular-root V1 config', () => Effect.gen(function* () {
    const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), 'prelude-config-v1-')))
    yield* Effect.promise(() => mkdir(join(root, '.prelude')))
    yield* Effect.promise(() => writeFile(join(root, '.prelude/config.jsonc'), '{ "schemaVersion": 1, "integrations": [{ "id": "legacy", "module": "legacy/prelude", "packageRoot": "." }] }'))

    expect((yield* Effect.exit(loadPreludeConfig(root)))._tag).toBe('Failure')
  }).pipe(Effect.provide(NodeServices.layer)))

  it.effect('generates stable reversible cross-platform workspace segments', () => Effect.sync(() => {
    expect(encodeIntegrationId('effect:workspace')).toBe('i-effect%3Aworkspace')
    expect(encodeIntegrationId('effect/workspace')).toBe('i-effect%2Fworkspace')
    expect(decodeURIComponent(encodeIntegrationId('effect/workspace').slice(2))).toBe('effect/workspace')
  }))
})
