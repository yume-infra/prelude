import type { LifecycleProviderRegistry } from '@/core/lifecycle'
import assert from 'node:assert/strict'
import { Effect } from 'effect'
import { describe, it } from 'vitest'
import { makeTargetDir } from '@/brand/target-dir'
import { runProviderLifecycleStatus, runProviderLifecycleUpdate, runProviderLifecycleVerify } from '@/core/lifecycle'
import { makeFsMockLayer } from '../../support/fs-mock'

function manifestJson(overrides: Record<string, unknown> = {}) {
  return `${JSON.stringify({
    schemaVersion: 1,
    preludeVersion: '0.0.0-test',
    createSpec: {
      topology: 'single-package',
      package: {
        id: 'worker',
        name: 'worker',
        capabilities: ['effect-package'],
      },
      rootCapabilities: ['ai-harness'],
      providers: ['effect-harness'],
      overrides: {},
    },
    resolvedGraph: {
      topology: 'single-package',
      rootPackage: {
        id: 'worker',
        name: 'worker',
        path: '.',
        capabilities: ['effect-package'],
      },
      packages: [],
      rootCapabilities: ['ai-harness'],
      packageCapabilities: {
        worker: ['effect-package'],
      },
      providers: [],
      logicalSurfaces: [],
      verification: [],
    },
    pins: {
      packageManager: 'pnpm@10.33.4',
      typescript: 'catalog:',
    },
    lifecycleProviders: [],
    lifecycleSurfaces: [],
    generatedUserSurfaces: [],
    verificationRecords: [],
    ...overrides,
  }, null, 2)}\n`
}

const effectHarnessRecord = {
  id: 'effect-harness',
  contractVersion: '1',
  artifact: {
    id: 'effect-harness',
    version: '0.1.0',
    source: {
      repository: 'https://example.com/effect-harness.git',
      branch: 'main',
      split: 'abc123',
    },
    packageBaseline: {
      effect: '4.0.0-beta.90',
    },
  },
  projectedContext: {
    topology: 'single-package',
    packageScopes: ['worker'],
    rootCapabilities: ['ai-harness'],
    packageCapabilities: {
      worker: ['effect-package'],
    },
  },
  lifecycleSurfaces: [],
  verificationRecordId: 'provider:effect-harness:create-contract',
} as const

describe('provider lifecycle runtime', () => {
  it('blocks when no prelude manifest exists', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(false),
    })

    const result = await Effect.runPromise(
      Effect.either(
        runProviderLifecycleStatus({
          targetDir: makeTargetDir('/project'),
          providers: {},
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Left')
    if (result._tag === 'Left') {
      assert.match(result.left.message, /No prelude manifest found/)
      assert.match(result.left.message, /\.prelude\/manifest\.json/)
    }
  })

  it('reports no-op when the manifest has no active lifecycle providers', async () => {
    const writes: string[] = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: () => Effect.succeed(manifestJson()),
      writeFileString: path => Effect.sync(() => {
        writes.push(path)
      }),
    })

    const result = await Effect.runPromise(
      runProviderLifecycleStatus({
        targetDir: makeTargetDir('/project'),
        providers: {},
      }).pipe(Effect.provide(fsLayer)),
    )

    assert.deepEqual(result, {
      command: 'status',
      status: 'noop',
      providers: [],
    })
    assert.deepEqual(writes, [])
  })

  it('blocks when --provider selects a missing lifecycle provider record', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: () => Effect.succeed(manifestJson()),
    })

    const result = await Effect.runPromise(
      Effect.either(
        runProviderLifecycleStatus({
          targetDir: makeTargetDir('/project'),
          provider: 'effect-harness',
          providers: {},
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Left')
    if (result._tag === 'Left') {
      assert.match(result.left.message, /No active lifecycle provider/)
      assert.match(result.left.message, /effect-harness/)
    }
  })

  it('runs status read-only without provider verification', async () => {
    const calls: string[] = []
    const writes: string[] = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: () => Effect.succeed(manifestJson({
        lifecycleProviders: [effectHarnessRecord],
      })),
      writeFileString: path => Effect.sync(() => {
        writes.push(path)
      }),
    })

    const result = await Effect.runPromise(
      runProviderLifecycleStatus({
        targetDir: makeTargetDir('/project'),
        providers: {
          'effect-harness': {
            id: 'effect-harness',
            contractVersion: '1',
            status: record => Effect.sync(() => {
              calls.push(`status:${record.id}`)
              return {
                providerId: record.id,
                status: 'ok',
              } as const
            }),
            verify: record => Effect.sync(() => {
              calls.push(`verify:${record.id}`)
              return {
                providerId: record.id,
                status: 'passed',
              } as const
            }),
            planUpdate: record => Effect.sync(() => {
              calls.push(`planUpdate:${record.id}`)
              return {
                providerId: record.id,
                operations: [],
              }
            }),
          },
        },
      }).pipe(Effect.provide(fsLayer)),
    )

    assert.deepEqual(result, {
      command: 'status',
      status: 'completed',
      providers: [
        {
          providerId: 'effect-harness',
          status: 'ok',
        },
      ],
    })
    assert.deepEqual(calls, ['status:effect-harness'])
    assert.deepEqual(writes, [])
  })

  it('runs provider verify without status or update planning', async () => {
    const calls: string[] = []
    const writes: string[] = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: () => Effect.succeed(manifestJson({
        lifecycleProviders: [effectHarnessRecord],
      })),
      writeFileString: path => Effect.sync(() => {
        writes.push(path)
      }),
    })

    const result = await Effect.runPromise(
      runProviderLifecycleVerify({
        targetDir: makeTargetDir('/project'),
        providers: {
          'effect-harness': {
            id: 'effect-harness',
            contractVersion: '1',
            status: record => Effect.sync(() => {
              calls.push(`status:${record.id}`)
              return {
                providerId: record.id,
                status: 'ok',
              } as const
            }),
            verify: record => Effect.sync(() => {
              calls.push(`verify:${record.id}`)
              return {
                providerId: record.id,
                status: 'passed',
              } as const
            }),
            planUpdate: record => Effect.sync(() => {
              calls.push(`planUpdate:${record.id}`)
              return {
                providerId: record.id,
                operations: [],
              }
            }),
          },
        },
      }).pipe(Effect.provide(fsLayer)),
    )

    assert.deepEqual(result, {
      command: 'verify',
      status: 'completed',
      providers: [
        {
          providerId: 'effect-harness',
          status: 'passed',
        },
      ],
    })
    assert.deepEqual(calls, ['verify:effect-harness'])
    assert.deepEqual(writes, [])
  })

  it('blocks update plans that target undeclared external writes', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: path =>
        Effect.succeed(path.endsWith('manifest.json')
          ? manifestJson({
              lifecycleProviders: [effectHarnessRecord],
              generatedUserSurfaces: [
                {
                  path: 'package.json',
                  creator: 'materializer:package-json',
                  authority: 'none',
                  operationId: 'write-package-json',
                },
              ],
            })
          : '{ "scripts": { "build": "tsc --noEmit" } }\n'),
    })

    const result = await Effect.runPromise(
      Effect.either(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: {
            'effect-harness': {
              id: 'effect-harness',
              contractVersion: '1',
              status: record => Effect.succeed({ providerId: record.id, status: 'ok' as const }),
              verify: record => Effect.succeed({ providerId: record.id, status: 'passed' as const }),
              planUpdate: record => Effect.succeed({
                providerId: record.id,
                operations: [
                  {
                    kind: 'replaceStructuredPointer',
                    surfaceId: 'package-manifest:root:/scripts/build',
                    path: 'package.json',
                    pointer: '/scripts/build',
                    value: 'tsgo --noEmit',
                  },
                ],
              }),
            },
          },
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Left')
    if (result._tag === 'Left') {
      assert.match(result.left.message, /undeclared external lifecycle surface/)
      assert.match(result.left.message, /package\.json/)
    }
  })

  it('updates provider namespace files while ignoring handed-off scaffold drift', async () => {
    const calls: string[] = []
    const writes: Array<{ path: string, content: string }> = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: path =>
        Effect.succeed(path.endsWith('manifest.json')
          ? manifestJson({
              lifecycleProviders: [effectHarnessRecord],
              generatedUserSurfaces: [
                {
                  path: 'package.json',
                  creator: 'materializer:package-json',
                  authority: 'none',
                  operationId: 'write-package-json',
                },
              ],
            })
          : '{ "scripts": { "build": "user changed this handed-off scaffold" } }\n'),
      writeFileString: (path, content) => Effect.sync(() => {
        writes.push({ path, content })
      }),
    })

    const result = await Effect.runPromise(
      runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers: {
          'effect-harness': {
            id: 'effect-harness',
            contractVersion: '1',
            status: record => Effect.sync(() => {
              calls.push(`status:${record.id}`)
              return { providerId: record.id, status: 'changed' as const }
            }),
            verify: record => Effect.sync(() => {
              calls.push(`verify:${record.id}`)
              return { providerId: record.id, status: 'passed' as const }
            }),
            planUpdate: record => Effect.sync(() => {
              calls.push(`planUpdate:${record.id}`)
              return {
                providerId: record.id,
                operations: [
                  {
                    kind: 'replaceProviderFile',
                    path: '.prelude/providers/effect-harness/provider.json',
                    content: '{ "id": "effect-harness", "version": "0.1.1" }\n',
                  },
                ],
              }
            }),
          },
        },
      }).pipe(Effect.provide(fsLayer)),
    )

    assert.deepEqual(result, {
      command: 'update',
      status: 'completed',
      providers: [
        {
          providerId: 'effect-harness',
          status: 'passed',
        },
      ],
    })
    assert.deepEqual(calls, ['status:effect-harness', 'planUpdate:effect-harness', 'verify:effect-harness'])
    assert.deepEqual(writes.map(write => write.path), [
      '/project/.prelude/providers/effect-harness/provider.json',
      '/project/.prelude/manifest.json',
    ])
    assert.match(writes[0]!.content, /0\.1\.1/)
    assert.match(writes[1]!.content, /"lifecycleProviders"/)
  })

  it('blocks update when a bounded structured pointer drifted', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: path =>
        Effect.succeed(path.endsWith('manifest.json')
          ? manifestJson({
              lifecycleProviders: [{
                ...effectHarnessRecord,
                lifecycleSurfaces: ['package-manifest:root:/devDependencies/@effect~1tsgo'],
              }],
              lifecycleSurfaces: [
                {
                  id: 'package-manifest:root:/devDependencies/@effect~1tsgo',
                  owner: 'provider:effect-harness',
                  authority: 'bounded',
                  kind: 'structuredPointer',
                  path: 'package.json',
                  pointer: '/devDependencies/@effect~1tsgo',
                  snapshot: '0.14.6',
                  operationId: 'write-package-json',
                },
              ],
            })
          : '{ "devDependencies": { "@effect/tsgo": "manual-change" } }\n'),
    })

    const result = await Effect.runPromise(
      Effect.either(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: {
            'effect-harness': {
              id: 'effect-harness',
              contractVersion: '1',
              status: record => Effect.succeed({ providerId: record.id, status: 'changed' as const }),
              verify: record => Effect.succeed({ providerId: record.id, status: 'passed' as const }),
              planUpdate: record => Effect.succeed({
                providerId: record.id,
                operations: [
                  {
                    kind: 'replaceStructuredPointer',
                    surfaceId: 'package-manifest:root:/devDependencies/@effect~1tsgo',
                    path: 'package.json',
                    pointer: '/devDependencies/@effect~1tsgo',
                    value: '0.15.0',
                  },
                ],
              }),
            },
          },
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Left')
    if (result._tag === 'Left') {
      assert.match(result.left.message, /drifted/)
      assert.match(result.left.message, /@effect~1tsgo/)
    }
  })

  it('blocks update when an owned external lifecycle file drifted', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: path =>
        Effect.succeed(path.endsWith('manifest.json')
          ? manifestJson({
              lifecycleProviders: [{
                ...effectHarnessRecord,
                lifecycleSurfaces: ['agents-provider-block'],
              }],
              lifecycleSurfaces: [
                {
                  id: 'agents-provider-block',
                  owner: 'provider:effect-harness',
                  authority: 'owner',
                  kind: 'ownedFile',
                  path: 'AGENTS.md',
                  snapshot: 'original provider instructions\n',
                  operationId: 'write-agents-provider-block',
                },
              ],
            })
          : 'manual change\n'),
    })

    const result = await Effect.runPromise(
      Effect.either(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: {
            'effect-harness': {
              id: 'effect-harness',
              contractVersion: '1',
              status: record => Effect.succeed({ providerId: record.id, status: 'changed' as const }),
              verify: record => Effect.succeed({ providerId: record.id, status: 'passed' as const }),
              planUpdate: record => Effect.succeed({
                providerId: record.id,
                operations: [
                  {
                    kind: 'replaceOwnedFile',
                    surfaceId: 'agents-provider-block',
                    path: 'AGENTS.md',
                    content: 'updated provider instructions\n',
                  },
                ],
              }),
            },
          },
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Left')
    if (result._tag === 'Left') {
      assert.match(result.left.message, /drifted/)
      assert.match(result.left.message, /AGENTS\.md/)
    }
  })

  it('updates all providers by default and only the selected provider with --provider', async () => {
    const otherRecord = {
      ...effectHarnessRecord,
      id: 'other-harness',
      verificationRecordId: 'provider:other-harness:create-contract',
    }
    const calls: string[] = []
    const writes: string[] = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: () => Effect.succeed(manifestJson({
        lifecycleProviders: [effectHarnessRecord, otherRecord],
      })),
      writeFileString: path => Effect.sync(() => {
        writes.push(path)
      }),
    })
    const providers = {
      'effect-harness': {
        id: 'effect-harness',
        contractVersion: '1',
        status: record => Effect.sync(() => {
          calls.push(`status:${record.id}`)
          return { providerId: record.id, status: 'changed' as const }
        }),
        verify: record => Effect.sync(() => {
          calls.push(`verify:${record.id}`)
          return { providerId: record.id, status: 'passed' as const }
        }),
        planUpdate: record => Effect.sync(() => {
          calls.push(`planUpdate:${record.id}`)
          return { providerId: record.id, operations: [] }
        }),
      },
      'other-harness': {
        id: 'other-harness',
        contractVersion: '1',
        status: record => Effect.sync(() => {
          calls.push(`status:${record.id}`)
          return { providerId: record.id, status: 'changed' as const }
        }),
        verify: record => Effect.sync(() => {
          calls.push(`verify:${record.id}`)
          return { providerId: record.id, status: 'passed' as const }
        }),
        planUpdate: record => Effect.sync(() => {
          calls.push(`planUpdate:${record.id}`)
          return { providerId: record.id, operations: [] }
        }),
      },
    } satisfies LifecycleProviderRegistry

    await Effect.runPromise(
      runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers,
      }).pipe(Effect.provide(fsLayer)),
    )

    assert.deepEqual(calls, [
      'status:effect-harness',
      'planUpdate:effect-harness',
      'status:other-harness',
      'planUpdate:other-harness',
      'verify:effect-harness',
      'verify:other-harness',
    ])

    calls.length = 0
    await Effect.runPromise(
      runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        provider: 'other-harness',
        providers,
      }).pipe(Effect.provide(fsLayer)),
    )

    assert.deepEqual(calls, [
      'status:other-harness',
      'planUpdate:other-harness',
      'verify:other-harness',
    ])
    assert.deepEqual(writes, ['/project/.prelude/manifest.json', '/project/.prelude/manifest.json'])
  })
})
