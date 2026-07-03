import type { JsonValue, LifecycleSurfaceRecord } from '@/core/create'
import type { LifecycleProviderRegistry, ProviderUpdateOperation } from '@/core/lifecycle'
import { assert, describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import { makeTargetDir } from '@/brand/target-dir'
import { effectHarnessProviderRecordForProjectedContext } from '@/core/create/effect-harness-provider'
import { effectHarnessLifecycleProviderForDiscovery, reconcileManagedLogicalValue, runProviderLifecycleStatus, runProviderLifecycleUpdate, runProviderLifecycleVerify } from '@/core/lifecycle'
import { effectHarnessDiscoveryFixture } from '../../support/effect-harness-discovery'
import { makeFsMockLayer } from '../../support/fs-mock'

function jsonObject(value: JsonValue | undefined): Record<string, JsonValue> {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('expected JSON object')
  }
  return value as Record<string, JsonValue>
}

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
    maintainProviders: [],
    generatedUserSurfaces: [],
    verificationRecords: [],
    ...overrides,
  }, null, 2)}\n`
}

const effectHarnessProjectedContext = {
  topology: 'single-package',
  packageScopes: ['worker'],
  packagePaths: {},
  rootCapabilities: ['ai-harness'],
  packageCapabilities: {
    worker: ['effect-package'],
  },
} as const

const effectHarnessRecord = effectHarnessProviderRecordForProjectedContext(
  effectHarnessDiscoveryFixture,
  effectHarnessProjectedContext,
)

const effectHarnessReference = {
  id: 'effect-harness',
  contractVersion: '1',
  providerVersion: '0.1.0',
  profile: 'codex-effect-v4',
  recordPath: '.prelude/providers/effect-harness/provider.json',
} as const

const discoveredProvider = {
  ...effectHarnessDiscoveryFixture,
  packageLocator: {
    ...effectHarnessDiscoveryFixture.packageLocator,
    packageName: '@sayoriqwq/effect-harness',
    packageVersion: '9.9.9-test',
    binName: 'effect-harness',
    binPath: 'dist/bin/effect-harness.js',
    discoveryCommand: 'npx --yes @sayoriqwq/effect-harness provider-discover',
    packageFiles: ['provider', 'harness', 'repos'],
  },
  provider: {
    ...effectHarnessDiscoveryFixture.provider,
    id: 'effect-harness',
    contractVersion: '7-test',
    providerVersion: '9.9.9-test',
    defaultProfile: 'codex-effect-v4',
  },
  artifactOnlyReferences: {
    ...effectHarnessDiscoveryFixture.artifactOnlyReferences,
    mode: 'provider-artifact-reference',
    targetDelivery: 'identity-only',
    packageSurface: ['provider', 'harness', 'repos'],
    references: {
      'effect-source-tree': {
        sourceEntry: 'effect-official-source',
        path: 'repos/effect',
        targetDelivery: 'artifact-only',
      },
    },
  },
  sourceIdentities: {
    ...effectHarnessDiscoveryFixture.sourceIdentities,
    defaultSourceEntry: 'effect-official-source',
    sourceEntries: ['effect-official-source'],
    sourceBoundary: {
      providerRepoInternal: true,
      targetDelivery: 'identity-only',
      targetMustNotReceive: ['repos/effect'],
      allowedTargetSourceIdentity: ['artifact.sourceIdentities'],
    },
    providerSourceEntries: {},
    artifactReferences: {},
  },
} as const

function providerRecordJson(record: unknown = effectHarnessRecord) {
  return `${JSON.stringify(record, null, 2)}\n`
}

const tsgoSurfaceId = 'package-manifest:root:/devDependencies/@effect~1tsgo'
const tsgoPointer = '/devDependencies/@effect~1tsgo'
const managedBlockPath = 'NOTES.md'
const managedBlockSurfaceId = 'provider-managed-block:effect-harness:NOTES.md#example'
const managedBlockStart = '<!-- example:start -->'
const managedBlockEnd = '<!-- example:end -->'
const originalManagedBlock = `${managedBlockStart}
original provider instructions
${managedBlockEnd}
`
const updatedManagedBlock = `${managedBlockStart}
updated provider instructions
${managedBlockEnd}
`

function structuredPointerSurface(overrides: Record<string, unknown> = {}): LifecycleSurfaceRecord {
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
    base: '0.15.0',
    snapshot: '0.15.0',
    operationId: 'write-package-json',
    ...overrides,
  } as LifecycleSurfaceRecord
}

function ownedFileSurface(overrides: Record<string, unknown> = {}): LifecycleSurfaceRecord {
  return {
    id: 'provider-notes',
    owner: 'provider:effect-harness',
    lifecycle: 'managed',
    scope: 'file',
    locator: managedBlockPath,
    conflictPolicy: 'block',
    contractVersion: '1',
    implementationVersion: '0.1.0',
    authority: 'owner',
    kind: 'ownedFile',
    path: managedBlockPath,
    base: 'original provider instructions\n',
    snapshot: 'original provider instructions\n',
    operationId: 'write-provider-notes',
    ...overrides,
  } as LifecycleSurfaceRecord
}

function managedBlockSurface(overrides: Record<string, unknown> = {}): LifecycleSurfaceRecord {
  return {
    id: managedBlockSurfaceId,
    owner: 'provider:effect-harness',
    lifecycle: 'managed',
    scope: 'entry',
    locator: `${managedBlockPath}#example`,
    conflictPolicy: 'block',
    contractVersion: '1',
    implementationVersion: '0.1.0',
    authority: 'bounded',
    kind: 'managedBlock',
    path: managedBlockPath,
    startMarker: managedBlockStart,
    endMarker: managedBlockEnd,
    base: originalManagedBlock,
    snapshot: originalManagedBlock,
    operationId: 'write-provider-notes-block',
    ...overrides,
  } as LifecycleSurfaceRecord
}

function providerRecordWithSurfaces(surfaces: readonly LifecycleSurfaceRecord[]) {
  return {
    ...effectHarnessRecord,
    surfaces,
  }
}

function readLifecycleFiles(input: {
  readonly manifest?: string
  readonly providerRecord?: unknown
  readonly fallback?: string | ((path: string) => string)
} = {}) {
  const manifest = input.manifest ?? manifestJson()
  const providerRecord = input.providerRecord ?? effectHarnessRecord

  return (path: string) => {
    if (path.endsWith('.prelude/manifest.json')) {
      return Effect.succeed(manifest)
    }

    if (path.endsWith('.prelude/providers/effect-harness/provider.json')) {
      return Effect.succeed(providerRecordJson(providerRecord))
    }

    if (typeof input.fallback === 'function') {
      return Effect.succeed(input.fallback(path))
    }

    return Effect.succeed(input.fallback ?? '')
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

function replaceManagedBlockOperation(content: string): ProviderUpdateOperation {
  return {
    kind: 'replaceManagedBlock',
    surfaceId: managedBlockSurfaceId,
    path: managedBlockPath,
    startMarker: managedBlockStart,
    endMarker: managedBlockEnd,
    content,
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
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([]),
      }),
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

  it('runs provider verify with read-only update preflight', async () => {
    const calls: string[] = []
    const writes: string[] = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([]),
      }),
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
    assert.deepEqual(calls, ['verify:effect-harness', 'planUpdate:effect-harness'])
    assert.deepEqual(writes, [])
  })

  it.effect('reports failed verify when a retained lifecycle surface is omitted from the provider plan', () =>
    Effect.gen(function* () {
      const writes: string[] = []
      const fsLayer = makeFsMockLayer({
        exists: () => Effect.succeed(true),
        readFileString: readLifecycleFiles({
          manifest: manifestJson({
            maintainProviders: [effectHarnessReference],
          }),
          providerRecord: providerRecordWithSurfaces([
            structuredPointerSurface(),
          ]),
        }),
        writeFileString: path => Effect.sync(() => {
          writes.push(path)
        }),
      })

      const result = yield* runProviderLifecycleVerify({
        targetDir: makeTargetDir('/project'),
        providers: registryWithOperations([]),
      }).pipe(Effect.provide(fsLayer))

      assert.deepEqual(result, {
        command: 'verify',
        status: 'completed',
        providers: [
          {
            providerId: 'effect-harness',
            status: 'failed',
            message: `Provider effect-harness update plan omits active lifecycle surface(s): ${tsgoSurfaceId}`,
          },
        ],
      })
      assert.deepEqual(writes, [])
    }))

  it.effect('blocks update when a retained lifecycle surface is omitted from the provider plan', () =>
    Effect.gen(function* () {
      const writes: string[] = []
      const fsLayer = makeFsMockLayer({
        exists: () => Effect.succeed(true),
        readFileString: readLifecycleFiles({
          manifest: manifestJson({
            maintainProviders: [effectHarnessReference],
          }),
          providerRecord: providerRecordWithSurfaces([
            structuredPointerSurface(),
          ]),
        }),
        writeFileString: path => Effect.sync(() => {
          writes.push(path)
        }),
      })

      const result = yield* Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: registryWithOperations([]),
        }).pipe(Effect.provide(fsLayer)),
      )

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /omits active lifecycle surface/)
        assert.match(result.failure.message, /@effect~1tsgo/)
      }
      assert.deepEqual(writes, [])
    }))

  it('effect-harness adapter returns declarative provider and managed-surface operations', async () => {
    const provider = effectHarnessLifecycleProviderForDiscovery(effectHarnessDiscoveryFixture)
    const status = await Effect.runPromise(provider.status(effectHarnessRecord))
    const verify = await Effect.runPromise(provider.verify(effectHarnessRecord))
    const plan = await Effect.runPromise(provider.planUpdate(effectHarnessRecord, { providerId: 'effect-harness' }))

    assert.equal(status.providerId, 'effect-harness')
    assert.equal(status.status, 'ok')
    assert.equal(verify.status, 'passed')
    assert.ok(!plan.operations.some(operation => operation.path === '.prelude/providers/effect-harness/provider.json'))
    assert.ok(!plan.operations.some(operation => operation.path === '.effect-harness.json'))
    assert.ok(plan.operations.some(operation =>
      operation.kind === 'replaceStructuredPointer'
      && operation.path === 'package.json'
      && operation.pointer === '/scripts/typecheck'))
    assert.deepEqual(plan.nextRecord?.surfaces.map(surface => surface.id), plan.operations.map((operation) => {
      if (operation.kind === 'replaceOwnedFile') {
        return `provider-managed-file:effect-harness:${operation.path}`
      }
      return operation.surfaceId
    }))
  })

  it('effect-harness adapter compares provider identity against discovery output', async () => {
    const provider = effectHarnessLifecycleProviderForDiscovery(discoveredProvider)
    const record = effectHarnessProviderRecordForProjectedContext(discoveredProvider, effectHarnessRecord.projectedContext)

    const okStatus = await Effect.runPromise(provider.status(record))
    const okVerify = await Effect.runPromise(provider.verify(record))
    assert.equal(okStatus.status, 'ok')
    assert.equal(okVerify.status, 'passed')

    const packageLocator = jsonObject(record.artifact.packageLocator)
    const staleRecord = {
      ...record,
      providerVersion: '0.0.0-stale',
      artifact: {
        ...record.artifact,
        packageLocator: {
          ...packageLocator,
          packageVersion: '0.0.0-stale',
        },
      },
    }
    const staleStatus = await Effect.runPromise(provider.status(staleRecord))
    const staleVerify = await Effect.runPromise(provider.verify(staleRecord))
    assert.equal(staleStatus.status, 'changed')
    assert.equal(staleVerify.status, 'failed')
    assert.match(staleVerify.message ?? '', /discovered provider identity/u)
  })

  it('projects the effect-harness first-party provider interface without source-entry surfaces', async () => {
    const provider = effectHarnessLifecycleProviderForDiscovery(effectHarnessDiscoveryFixture)
    const record = effectHarnessProviderRecordForProjectedContext(effectHarnessDiscoveryFixture, {
      topology: 'single-package',
      packageScopes: ['worker'],
      packagePaths: {},
      rootCapabilities: ['ai-harness'],
      packageCapabilities: {
        worker: ['effect-package'],
      },
    })

    assert.equal(record.id, 'effect-harness')
    assert.equal(record.profile, 'codex-effect-v4')
    assert.equal(record.options.lifecycleOwner, 'prelude')
    assert.deepEqual(record.options.languageService, {
      enabled: true,
      floatingEffect: 'error',
    })
    const packageBaseline = jsonObject(jsonObject(record.options.effect).packageBaseline)
    assert.equal(packageBaseline.effect, '4.0.0-beta.92')
    assert.equal(packageBaseline['@effect/tsgo'], '0.15.0')
    assert.equal(packageBaseline.eslint, '^10.3.0')
    assert.equal(packageBaseline.vitest, '^4.1.8')
    const policies = jsonObject(record.options.policies)
    assert.deepEqual(Object.keys(policies).sort(), [
      'editorPolicy',
      'lintGuardrails',
      'testPolicy',
      'verificationPolicy',
    ])
    assert.equal(jsonObject(policies.lintGuardrails).command, 'pnpm lint --max-warnings 0')
    assert.equal(jsonObject(policies.testPolicy).packageScript, 'vitest run')
    assert.equal(jsonObject(policies.verificationPolicy).lifecycleOwner, 'prelude')
    assert.deepEqual(record.runtime.files, [])
    assert.equal(record.runtime.commands.discover, 'npx --yes @sayoriqwq/effect-harness provider-discover')
    assert.equal(record.runtime.routes.providerProfile, 'provider/effect-harness.provider.json')
    const targetManagedSurfaces = jsonObject(record.runtime.targetManagedSurfaces)
    const contributionBuckets = jsonObject(targetManagedSurfaces.contributions)
    assert.deepEqual(Object.keys(contributionBuckets).sort(), [
      'editorPolicy',
      'lintGuardrails',
      'packageJson',
      'testPolicy',
      'tsconfig',
      'verificationPolicy',
    ])
    const artifactOnlyReferences = jsonObject(record.artifact.artifactOnlyReferences)
    const references = jsonObject(artifactOnlyReferences.references)
    const sourceIdentities = jsonObject(record.artifact.sourceIdentities)
    assert.equal(Object.hasOwn(record.artifact, 'artifactRoot'), false)
    assert.equal(Object.hasOwn(record.artifact, 'providerProfilePath'), false)
    assert.deepEqual(Object.keys(references).sort(), [
      'effect-anchor-doc',
      'effect-route-doc',
      'effect-source-contract',
      'effect-source-tree',
      'tsgo-anchor-doc',
      'tsgo-route-doc',
      'tsgo-source-contract',
      'tsgo-source-tree',
    ])
    assert.equal(sourceIdentities.defaultSourceEntry, 'effect-official-source')

    const surfacePaths = record.surfaces.map(surface => surface.path)
    assert.isTrue(surfacePaths.includes('tsconfig.json'))
    assert.isTrue(surfacePaths.includes('.prelude/providers/effect-harness/eslint.config.mjs'))
    assert.isTrue(surfacePaths.includes('.prelude/providers/effect-harness/docs/discovery.md'))
    assert.isTrue(surfacePaths.includes('.prelude/providers/effect-harness/snippets/agents.md'))
    assert.isFalse(surfacePaths.some(surfacePath => surfacePath.startsWith('repos/')))
    assert.isFalse(surfacePaths.includes('.effect-harness.json'))
    assert.isFalse(surfacePaths.includes('AGENTS.md'))
    assert.isFalse(surfacePaths.some(surfacePath => surfacePath.startsWith('.codex/')))
    assert.isFalse(surfacePaths.some(surfacePath => surfacePath.startsWith('.vscode/') || surfacePath.startsWith('.zed/')))
    assert.isFalse(record.surfaces.some(surface => surface.kind === 'managedBlock'))
    const editorPolicy = jsonObject(contributionBuckets.editorPolicy)
    const editorPolicies = jsonObject(editorPolicy.policies)
    const autoImportExclude = jsonObject(editorPolicies.autoImportExclude)
    const vscodeAutoImportExclude = jsonObject(autoImportExclude.vscode)
    assert.deepEqual(vscodeAutoImportExclude, {
      'typescript.preferences.autoImportFileExcludePatterns': ['repos/**'],
      'javascript.preferences.autoImportFileExcludePatterns': ['repos/**'],
    })
    assert.equal(jsonObject(editorPolicies.filesExclude).level, 'preference')

    const status = await Effect.runPromise(provider.status(record))
    const verify = await Effect.runPromise(provider.verify(record))
    assert.equal(status.status, 'ok')
    assert.equal(verify.status, 'passed')

    const staleRuntimeRecord = {
      ...record,
      runtime: {
        ...record.runtime,
        routes: {
          ...record.runtime.routes,
          providerProfile: 'old-provider-profile.json',
        },
      },
    }
    const staleStatus = await Effect.runPromise(provider.status(staleRuntimeRecord))
    const staleVerify = await Effect.runPromise(provider.verify(staleRuntimeRecord))
    assert.equal(staleStatus.status, 'changed')
    assert.equal(staleVerify.status, 'failed')
    assert.match(staleVerify.message ?? '', /runtime metadata/u)
  })

  it('blocks unsupported provider contract transitions without a declarative migration plan', async () => {
    const calls: string[] = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
      }),
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
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
          generatedUserSurfaces: [
            {
              path: 'package.json',
              creator: 'materializer:package-json',
              authority: 'none',
              operationId: 'write-package-json',
            },
          ],
        }),
        providerRecord: providerRecordWithSurfaces([]),
        fallback: '{ "scripts": { "build": "tsc --noEmit" } }\n',
      }),
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

  it('allows newly declared owned provider surfaces from the next provider record', async () => {
    const writes: Array<{ path: string, content: string }> = []
    const nextRecord = providerRecordWithSurfaces([
      ownedFileSurface({
        id: 'provider-notes',
        path: managedBlockPath,
        base: 'new provider notes\n',
        snapshot: 'new provider notes\n',
      }),
    ])
    const fsLayer = makeFsMockLayer({
      exists: path => Effect.succeed(!path.endsWith(managedBlockPath)),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([]),
        fallback: '',
      }),
      writeFileString: (path, content) => Effect.sync(() => {
        writes.push({ path, content })
      }),
    })

    await Effect.runPromise(
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
                  surfaceId: 'provider-notes',
                  path: managedBlockPath,
                  content: 'new provider notes\n',
                },
              ],
              nextRecord,
            }),
          },
        },
      }).pipe(Effect.provide(fsLayer)),
    )

    assert.deepEqual(writes.map(write => write.path), [
      '/project/NOTES.md',
      '/project/.prelude/providers/effect-harness/provider.json',
      '/project/.prelude/manifest.json',
    ])
    assert.equal(writes[0]?.content, 'new provider notes\n')
  })

  it('blocks newly declared structured provider surfaces when an external value already differs', async () => {
    const writes: string[] = []
    const buildSurfaceId = 'package-manifest:root:/scripts/build'
    const nextRecord = providerRecordWithSurfaces([
      structuredPointerSurface({
        id: buildSurfaceId,
        locator: 'package.json#/scripts/build',
        pointer: '/scripts/build',
        base: 'tsgo --noEmit',
        snapshot: 'tsgo --noEmit',
      }),
    ])
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([]),
        fallback: '{ "scripts": { "build": "tsc --noEmit" } }\n',
      }),
      writeFileString: path => Effect.sync(() => {
        writes.push(path)
      }),
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
                    kind: 'replaceStructuredPointer',
                    surfaceId: buildSurfaceId,
                    path: 'package.json',
                    pointer: '/scripts/build',
                    value: 'tsgo --noEmit',
                  },
                ],
                nextRecord,
              }),
            },
          },
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /cannot be adopted/)
      assert.match(result.failure.message, /package-manifest:root:\/scripts\/build/)
    }
    assert.deepEqual(writes, [])
  })

  it('updates provider namespace files while ignoring handed-off scaffold drift', async () => {
    const calls: string[] = []
    const writes: Array<{ path: string, content: string }> = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
          generatedUserSurfaces: [
            {
              path: 'package.json',
              creator: 'materializer:package-json',
              authority: 'none',
              operationId: 'write-package-json',
            },
          ],
        }),
        providerRecord: providerRecordWithSurfaces([]),
        fallback: '{ "scripts": { "build": "user changed this handed-off scaffold" } }\n',
      }),
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
                operations: [],
                nextRecord: {
                  ...record,
                  providerVersion: '0.1.1',
                },
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
    assert.match(writes[1]!.content, /"maintainProviders"/)
  })

  it.effect('blocks provider record references that point at invalid records', () =>
    Effect.gen(function* () {
      const writes: string[] = []
      const fsLayer = makeFsMockLayer({
        exists: () => Effect.succeed(true),
        readFileString: readLifecycleFiles({
          manifest: manifestJson({
            maintainProviders: [effectHarnessReference],
          }),
          providerRecord: {
            ...effectHarnessRecord,
            id: 'other-provider',
          },
        }),
        writeFileString: path => Effect.sync(() => {
          writes.push(path)
        }),
      })

      const result = yield* Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: registryWithOperations([]),
        }).pipe(Effect.provide(fsLayer)),
      )

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /does not match manifest reference/)
      }
      assert.deepEqual(writes, [])
    }))

  it('succeeds without rewriting a structured pointer when current already equals desired', async () => {
    const writes: Array<{ path: string, content: string }> = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([
          structuredPointerSurface(),
        ]),
        fallback: '{ "devDependencies": { "@effect/tsgo": "0.15.0" } }\n',
      }),
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
      '/project/.prelude/providers/effect-harness/provider.json',
      '/project/.prelude/manifest.json',
    ])
    assert.match(writes[0]!.content, /"base": "0\.15\.0"/)
    assert.match(writes[0]!.content, /"snapshot": "0\.15\.0"/)
  })

  it('applies desired structured pointer value when current still equals provider record base', async () => {
    const writes: Array<{ path: string, content: string }> = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([
          structuredPointerSurface({
            base: '0.0.0-old',
            snapshot: '0.0.0-old',
          }),
        ]),
        fallback: '{ "devDependencies": { "@effect/tsgo": "0.0.0-old" } }\n',
      }),
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
      '/project/.prelude/providers/effect-harness/provider.json',
      '/project/.prelude/manifest.json',
    ])
    assert.match(writes[0]!.content, /"@effect\/tsgo": "0\.15\.0"/)
    assert.match(writes[1]!.content, /"base": "0\.15\.0"/)
  })

  it.effect('does not treat structured pointer object key order as drift', () =>
    Effect.gen(function* () {
      const pluginsSurfaceId = 'tsconfig:root:/compilerOptions/plugins'
      const pluginsPointer = '/compilerOptions/plugins'
      const desiredPlugins = [
        {
          name: '@effect/language-service',
          options: {
            diagnosticSeverity: {
              floatingEffect: 'error',
            },
          },
        },
      ]
      const pluginSnapshot = JSON.stringify(desiredPlugins)
      const writes: Array<{ path: string, content: string }> = []
      const fsLayer = makeFsMockLayer({
        exists: () => Effect.succeed(true),
        readFileString: readLifecycleFiles({
          manifest: manifestJson({
            maintainProviders: [effectHarnessReference],
          }),
          providerRecord: providerRecordWithSurfaces([
            {
              id: pluginsSurfaceId,
              owner: 'provider:effect-harness',
              lifecycle: 'managed',
              scope: 'entry',
              locator: `tsconfig.json#${pluginsPointer}`,
              conflictPolicy: 'block',
              contractVersion: '1',
              implementationVersion: '0.1.0',
              authority: 'bounded',
              kind: 'structuredPointer',
              path: 'tsconfig.json',
              pointer: pluginsPointer,
              base: pluginSnapshot,
              snapshot: pluginSnapshot,
              operationId: 'write-tsconfig',
            },
          ]),
          fallback: '{ "compilerOptions": { "plugins": [{ "options": { "diagnosticSeverity": { "floatingEffect": "error" } }, "name": "@effect/language-service" }] } }\n',
        }),
        writeFileString: (path, content) => Effect.sync(() => {
          writes.push({ path, content })
        }),
      })

      const result = yield* runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers: registryWithOperations([
          {
            kind: 'replaceStructuredPointer',
            surfaceId: pluginsSurfaceId,
            path: 'tsconfig.json',
            pointer: pluginsPointer,
            value: desiredPlugins,
          },
        ]),
      }).pipe(Effect.provide(fsLayer))

      assert.deepEqual(result.status, 'completed')
      assert.deepEqual(writes.map(write => write.path), [
        '/project/.prelude/providers/effect-harness/provider.json',
        '/project/.prelude/manifest.json',
      ])
    }))

  it('blocks update when a bounded structured pointer drifted', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([
          structuredPointerSurface(),
        ]),
        fallback: '{ "devDependencies": { "@effect/tsgo": "manual-change" } }\n',
      }),
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

  it('blocks structured pointer drift even when desired still equals provider record base', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([
          structuredPointerSurface(),
        ]),
        fallback: '{ "devDependencies": { "@effect/tsgo": "manual-change" } }\n',
      }),
    })

    const result = await Effect.runPromise(
      Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: registryWithOperations([
            replaceTsgoOperation('0.15.0'),
          ]),
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /drifted/)
      assert.match(result.failure.message, /current differs from provider record base and desired value/)
    }
  })

  it('updates a managed block while preserving surrounding file content', async () => {
    const writes: Array<{ path: string, content: string }> = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([
          managedBlockSurface(),
        ]),
        fallback: `# Local instructions

${originalManagedBlock}
User-owned notes stay here.
`,
      }),
      writeFileString: (path, content) => Effect.sync(() => {
        writes.push({ path, content })
      }),
    })

    const result = await Effect.runPromise(
      runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers: registryWithOperations([
          replaceManagedBlockOperation(updatedManagedBlock),
        ]),
      }).pipe(Effect.provide(fsLayer)),
    )

    assert.deepEqual(result.status, 'completed')
    assert.deepEqual(writes.map(write => write.path), [
      '/project/NOTES.md',
      '/project/.prelude/providers/effect-harness/provider.json',
      '/project/.prelude/manifest.json',
    ])
    assert.match(writes[0]!.content, /^# Local instructions/u)
    assert.match(writes[0]!.content, /updated provider instructions/u)
    assert.match(writes[0]!.content, /User-owned notes stay here\./u)
    assert.isFalse(/original provider instructions/u.test(writes[0]!.content))
    assert.match(writes[1]!.content, /"base": "<!-- example:start -->\\nupdated provider instructions/u)
  })

  it('blocks update when a managed block drifted', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([
          managedBlockSurface(),
        ]),
        fallback: `${managedBlockStart}
manual provider block edit
${managedBlockEnd}
`,
      }),
    })

    const result = await Effect.runPromise(
      Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: registryWithOperations([
            replaceManagedBlockOperation(updatedManagedBlock),
          ]),
        }).pipe(Effect.provide(fsLayer)),
      ),
    )

    assert.strictEqual(result._tag, 'Failure')
    if (result._tag === 'Failure') {
      assert.match(result.failure.message, /drifted/)
      assert.match(result.failure.message, /NOTES\.md/)
    }
  })

  it.effect('blocks update when managed block markers are duplicated', () =>
    Effect.gen(function* () {
      const fsLayer = makeFsMockLayer({
        exists: () => Effect.succeed(true),
        readFileString: readLifecycleFiles({
          manifest: manifestJson({
            maintainProviders: [effectHarnessReference],
          }),
          providerRecord: providerRecordWithSurfaces([
            managedBlockSurface(),
          ]),
          fallback: `${originalManagedBlock}
${updatedManagedBlock}`,
        }),
      })

      const result = yield* Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: registryWithOperations([
            replaceManagedBlockOperation(updatedManagedBlock),
          ]),
        }).pipe(Effect.provide(fsLayer)),
      )

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /duplicated/)
        assert.match(result.failure.message, /NOTES\.md/)
      }
    }))

  it.effect('blocks manifest refresh when provider verification returns failed after applying files', () =>
    Effect.gen(function* () {
      const writes: Array<{ path: string, content: string }> = []
      const fsLayer = makeFsMockLayer({
        exists: () => Effect.succeed(true),
        readFileString: readLifecycleFiles({
          manifest: manifestJson({
            maintainProviders: [effectHarnessReference],
          }),
          providerRecord: providerRecordWithSurfaces([]),
        }),
        writeFileString: (path, content) => Effect.sync(() => {
          writes.push({ path, content })
        }),
      })

      const result = yield* Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: {
            'effect-harness': {
              id: 'effect-harness',
              contractVersion: '1',
              status: record => Effect.succeed({ providerId: record.id, status: 'changed' as const }),
              verify: record => Effect.succeed({
                providerId: record.id,
                status: 'failed' as const,
                message: 'provider output is invalid',
              }),
              planUpdate: record => Effect.succeed({
                providerId: record.id,
                operations: [],
                nextRecord: record,
              }),
            },
          },
        }).pipe(Effect.provide(fsLayer)),
      )

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /provider output is invalid/)
      }
      assert.deepEqual(writes.map(write => write.path), [])
    }))

  it('blocks update when an owned external lifecycle file drifted', async () => {
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: readLifecycleFiles({
        manifest: manifestJson({
          maintainProviders: [effectHarnessReference],
        }),
        providerRecord: providerRecordWithSurfaces([
          ownedFileSurface(),
        ]),
        fallback: 'manual change\n',
      }),
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
                    surfaceId: 'provider-notes',
                    path: 'NOTES.md',
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
      assert.match(result.failure.message, /NOTES\.md/)
    }
  })

  it('updates all providers by default and only the selected provider with --provider', async () => {
    const otherRecord = {
      ...effectHarnessRecord,
      id: 'other-harness',
      surfaces: [],
      verificationRecordId: 'provider:other-harness:create-contract',
    }
    const otherReference = {
      id: 'other-harness',
      contractVersion: '1',
      providerVersion: '0.1.0',
      profile: 'codex-effect-v4',
      recordPath: '.prelude/providers/other-harness/provider.json',
    }
    const calls: string[] = []
    const writes: string[] = []
    const fsLayer = makeFsMockLayer({
      exists: () => Effect.succeed(true),
      readFileString: (path) => {
        if (path.endsWith('.prelude/manifest.json')) {
          return Effect.succeed(manifestJson({
            maintainProviders: [effectHarnessReference, otherReference],
          }))
        }

        if (path.endsWith('.prelude/providers/effect-harness/provider.json')) {
          return Effect.succeed(providerRecordJson(providerRecordWithSurfaces([])))
        }

        if (path.endsWith('.prelude/providers/other-harness/provider.json')) {
          return Effect.succeed(providerRecordJson(otherRecord))
        }

        return Effect.succeed('')
      },
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
    assert.deepEqual(writes, [
      '/project/.prelude/providers/effect-harness/provider.json',
      '/project/.prelude/providers/other-harness/provider.json',
      '/project/.prelude/manifest.json',
      '/project/.prelude/providers/other-harness/provider.json',
      '/project/.prelude/manifest.json',
    ])
  })
})
