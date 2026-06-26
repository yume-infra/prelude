import type { LifecycleProviderRegistry, ProviderUpdateOperation } from '@/core/lifecycle'
import assert from 'node:assert/strict'
import { Effect } from 'effect'
import { describe, it } from 'vitest'
import { makeTargetDir } from '@/brand/target-dir'
import { reconcileManagedLogicalValue, runProviderLifecycleStatus, runProviderLifecycleUpdate, runProviderLifecycleVerify } from '@/core/lifecycle'
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

const tsgoSurfaceId = 'package-manifest:root:/devDependencies/@effect~1tsgo'
const tsgoPointer = '/devDependencies/@effect~1tsgo'

function structuredPointerSurface(overrides: Record<string, unknown> = {}) {
  return {
    id: tsgoSurfaceId,
    owner: 'provider:effect-harness',
    lifecycle: 'managed',
    scope: 'entry',
    locator: `package.json#${tsgoPointer}`,
    conflictPolicy: 'block',
    contractVersion: '1',
    implementationVersion: '0.1.0',
    authority: 'bounded',
    kind: 'structuredPointer',
    path: 'package.json',
    pointer: tsgoPointer,
    base: '0.14.6',
    snapshot: '0.14.6',
    operationId: 'write-package-json',
    ...overrides,
  }
}

function ownedFileSurface(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agents-provider-block',
    owner: 'provider:effect-harness',
    lifecycle: 'managed',
    scope: 'file',
    locator: 'AGENTS.md',
    conflictPolicy: 'block',
    contractVersion: '1',
    implementationVersion: '0.1.0',
    authority: 'owner',
    kind: 'ownedFile',
    path: 'AGENTS.md',
    base: 'original provider instructions\n',
    snapshot: 'original provider instructions\n',
    operationId: 'write-agents-provider-block',
    ...overrides,
  }
}

function replaceTsgoOperation(value: string): ProviderUpdateOperation {
  return {
    kind: 'replaceStructuredPointer',
    surfaceId: tsgoSurfaceId,
    path: 'package.json',
    pointer: tsgoPointer,
    value,
  }
}

function registryWithOperations(operations: readonly ProviderUpdateOperation[]) {
  return {
    'effect-harness': {
      id: 'effect-harness',
      contractVersion: '1',
      status: record => Effect.succeed({ providerId: record.id, status: 'changed' as const }),
      verify: record => Effect.succeed({ providerId: record.id, status: 'passed' as const }),
      planUpdate: record => Effect.succeed({
        providerId: record.id,
        operations,
      }),
    },
  } satisfies LifecycleProviderRegistry
}

describe('provider lifecycle runtime', () => {
  it('classifies managed logical values with strict desired/base/current reconciliation', () => {
    assert.deepEqual(
      reconcileManagedLogicalValue({ base: 'base', current: 'desired', desired: 'desired' }),
      { status: 'alreadyApplied' },
    )
    assert.deepEqual(
      reconcileManagedLogicalValue({ base: 'base', current: 'base', desired: 'desired' }),
      { status: 'apply' },
    )
    assert.deepEqual(
      reconcileManagedLogicalValue({ base: 'base', current: 'manual', desired: 'desired' }),
      { status: 'drift' },
    )
    assert.deepEqual(
      reconcileManagedLogicalValue({ base: 'base', current: 'manual', desired: 'base' }),
      { status: 'drift' },
    )
  })

  it('blocks when no prelude manifest exists', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(false),
    })

    const result = await Effect.runPromise(
      Effect.result(
        runProviderLifecycleStatus({
          targetDir: makeTargetDir('/project'),
          providers: {},
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /No prelude manifest found/)
      assert.match(result.failure.message, /\.prelude\/manifest\.json/)
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
      Effect.result(
        runProviderLifecycleStatus({
          targetDir: makeTargetDir('/project'),
          provider: 'effect-harness',
          providers: {},
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /No active lifecycle provider/)
      assert.match(result.failure.message, /effect-harness/)
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

  it('blocks unsupported provider contract transitions without a declarative migration plan', async () => {
    const calls: string[] = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: () => Effect.succeed(manifestJson({
        lifecycleProviders: [effectHarnessRecord],
      })),
    })

    const result = await Effect.runPromise(
      Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: {
            'effect-harness': {
              id: 'effect-harness',
              contractVersion: '2',
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
          },
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /contract transition 1 -> 2 is unsupported/)
      assert.match(result.failure.message, /declarative migration plan/)
    }
    assert.deepEqual(calls, [])
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
      Effect.result(
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

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /undeclared external lifecycle surface/)
      assert.match(result.failure.message, /package\.json/)
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

  it('succeeds without rewriting a structured pointer when current already equals desired', async () => {
    const writes: Array<{ path: string, content: string }> = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: path =>
        Effect.succeed(path.endsWith('manifest.json')
          ? manifestJson({
              lifecycleProviders: [{
                ...effectHarnessRecord,
                lifecycleSurfaces: [tsgoSurfaceId],
              }],
              lifecycleSurfaces: [
                structuredPointerSurface(),
              ],
            })
          : '{ "devDependencies": { "@effect/tsgo": "0.15.0" } }\n'),
      writeFileString: (path, content) => Effect.sync(() => {
        writes.push({ path, content })
      }),
    })

    const result = await Effect.runPromise(
      runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers: registryWithOperations([
          replaceTsgoOperation('0.15.0'),
        ]),
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
    assert.deepEqual(writes.map(write => write.path), [
      '/project/.prelude/manifest.json',
    ])
    assert.match(writes[0]!.content, /"base": "0\.15\.0"/)
    assert.match(writes[0]!.content, /"snapshot": "0\.15\.0"/)
  })

  it('applies desired structured pointer value when current still equals manifest base', async () => {
    const writes: Array<{ path: string, content: string }> = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: path =>
        Effect.succeed(path.endsWith('manifest.json')
          ? manifestJson({
              lifecycleProviders: [{
                ...effectHarnessRecord,
                lifecycleSurfaces: [tsgoSurfaceId],
              }],
              lifecycleSurfaces: [
                structuredPointerSurface(),
              ],
            })
          : '{ "devDependencies": { "@effect/tsgo": "0.14.6" } }\n'),
      writeFileString: (path, content) => Effect.sync(() => {
        writes.push({ path, content })
      }),
    })

    const result = await Effect.runPromise(
      runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers: registryWithOperations([
          replaceTsgoOperation('0.15.0'),
        ]),
      }).pipe(Effect.provide(fsLayer)),
    )

    assert.deepEqual(result.status, 'completed')
    assert.deepEqual(writes.map(write => write.path), [
      '/project/package.json',
      '/project/.prelude/manifest.json',
    ])
    assert.match(writes[0]!.content, /"@effect\/tsgo": "0\.15\.0"/)
    assert.match(writes[1]!.content, /"base": "0\.15\.0"/)
  })

  it('blocks update when a bounded structured pointer drifted', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: path =>
        Effect.succeed(path.endsWith('manifest.json')
          ? manifestJson({
              lifecycleProviders: [{
                ...effectHarnessRecord,
                lifecycleSurfaces: [tsgoSurfaceId],
              }],
              lifecycleSurfaces: [
                structuredPointerSurface(),
              ],
            })
          : '{ "devDependencies": { "@effect/tsgo": "manual-change" } }\n'),
    })

    const result = await Effect.runPromise(
      Effect.result(
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
                  replaceTsgoOperation('0.15.0'),
                ],
              }),
            },
          },
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /drifted/)
      assert.match(result.failure.message, /@effect~1tsgo/)
    }
  })

  it('blocks structured pointer drift even when desired still equals manifest base', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: path =>
        Effect.succeed(path.endsWith('manifest.json')
          ? manifestJson({
              lifecycleProviders: [{
                ...effectHarnessRecord,
                lifecycleSurfaces: [tsgoSurfaceId],
              }],
              lifecycleSurfaces: [
                structuredPointerSurface(),
              ],
            })
          : '{ "devDependencies": { "@effect/tsgo": "manual-change" } }\n'),
    })

    const result = await Effect.runPromise(
      Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: registryWithOperations([
            replaceTsgoOperation('0.14.6'),
          ]),
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /drifted/)
      assert.match(result.failure.message, /current differs from manifest base and desired value/)
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
                ownedFileSurface(),
              ],
            })
          : 'manual change\n'),
    })

    const result = await Effect.runPromise(
      Effect.result(
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

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /drifted/)
      assert.match(result.failure.message, /AGENTS\.md/)
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
