import type { JsonValue, LifecycleSurfaceRecord } from '@/core/create'
import type { LifecycleProviderRegistry, ProviderUpdateOperation } from '@/core/lifecycle'
import { assert, describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import { makeTargetDir } from '@/brand/target-dir'
import { effectHarnessProviderRecordForProjectedContext } from '@/core/create/effect-harness-provider'
import { effectHarnessLifecycleProviderForDiscovery, reconcileManagedLogicalValue, runProviderLifecycleStatus, runProviderLifecycleUpdate, runProviderLifecycleVerify } from '@/core/lifecycle'
import { FsService } from '@/core/services/fs'
import { stringifyJson } from '../../support/effect-files'
import { effectHarnessDiscoveryFixture, EffectHarnessDiscoveryTestLayer } from '../../support/effect-harness-discovery'
import { makeFsMockService } from '../../support/fs-mock'

function jsonObject(value: JsonValue | undefined): Record<string, JsonValue> {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('expected JSON object')
  }
  return value as Record<string, JsonValue>
}

function manifestJson(overrides: Record<string, unknown> = {}) {
  return `${stringifyJson({
    schemaVersion: 1,
    preludeVersion: '0.0.0-test',
    maintainProviders: [],
    verificationRecords: [],
    ...overrides,
  })}\n`
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
    discoveryCommand: 'npx --yes --package @sayoriqwq/effect-harness@9.9.9-test effect-harness provider-discover',
    packageFiles: ['HARNESS.md', 'README.md', 'dist', 'harness', 'provider', 'repos'],
  },
  packageArtifactIdentity: {
    ...effectHarnessDiscoveryFixture.packageArtifactIdentity,
    packageName: '@sayoriqwq/effect-harness',
    packageVersion: '9.9.9-test',
    npmSelector: '@sayoriqwq/effect-harness@9.9.9-test',
    neutralDiscoveryCommand: 'npx --yes --package @sayoriqwq/effect-harness@9.9.9-test effect-harness provider-discover',
  },
  provider: {
    ...effectHarnessDiscoveryFixture.provider,
    id: 'effect-harness',
    contractVersion: '7-test',
    providerVersion: '9.9.9-test',
    defaultProfile: 'codex-effect-v4',
  },
  semanticContributions: effectHarnessDiscoveryFixture.semanticContributions,
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
  artifactOnlyReferenceAudit: effectHarnessDiscoveryFixture.artifactOnlyReferenceAudit,
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
  return `${stringifyJson(record)}\n`
}

const tsgoSurfaceId = 'package-manifest:root:/devDependencies/@effect~1tsgo'
const tsgoPointer = '/devDependencies/@effect~1tsgo'
const eslintProviderHookSurfaceId = 'provider-managed-block:effect-harness:eslint.config.mjs#provider-config'
const vscodeTypescriptAutoImportSurfaceId = 'editor-settings:.vscode/settings.json:/typescript.preferences.autoImportFileExcludePatterns'
const vscodeJavascriptAutoImportSurfaceId = 'editor-settings:.vscode/settings.json:/javascript.preferences.autoImportFileExcludePatterns'
const vscodeWatchExcludeSurfaceId = 'editor-settings:.vscode/settings.json:/files.watcherExclude'
const vscodeSearchExcludeSurfaceId = 'editor-settings:.vscode/settings.json:/search.exclude'
const zedAutoImportSurfaceId = 'editor-settings:.zed/settings.json:/lsp/typescript-language-server/initialization_options/preferences/autoImportFileExcludePatterns'
const zedFileScanExclusionsSurfaceId = 'editor-settings:.zed/settings.json:/file_scan_exclusions'
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
  it.layer(EffectHarnessDiscoveryTestLayer)((it) => {
    it.effect('classifies managed logical values with strict desired/base/current reconciliation', () => Effect.sync(() => {
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
    }))

    it.effect('blocks when no prelude manifest exists', () => Effect.gen(function* () {
      const fsService = makeFsMockService({
        exists: () => Effect.succeed(false),
      })

      const result = yield* Effect.result(
        runProviderLifecycleStatus({
          targetDir: makeTargetDir('/project'),
          providers: {},
        }).pipe(Effect.provideService(FsService, fsService)),
      )

      assert.strictEqual(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /No prelude manifest found/)
        assert.match(result.failure.message, /\.prelude\/manifest\.json/)
      }
    }))

    it.effect('reports no-op when the manifest has no active lifecycle providers', () => Effect.gen(function* () {
      const writes: string[] = []
      const fsService = makeFsMockService({
        exists: () => Effect.succeed(true),
        readFileString: () => Effect.succeed(manifestJson()),
        writeFileString: path => Effect.sync(() => {
          writes.push(path)
        }),
      })

      const result = yield* runProviderLifecycleStatus({
        targetDir: makeTargetDir('/project'),
        providers: {},
      }).pipe(Effect.provideService(FsService, fsService))

      assert.deepEqual(result, {
        command: 'status',
        status: 'noop',
        providers: [],
      })
      assert.deepEqual(writes, [])
    }))

    it.effect('blocks when --provider selects a missing lifecycle provider record', () => Effect.gen(function* () {
      const fsService = makeFsMockService({
        exists: () => Effect.succeed(true),
        readFileString: () => Effect.succeed(manifestJson()),
      })

      const result = yield* Effect.result(
        runProviderLifecycleStatus({
          targetDir: makeTargetDir('/project'),
          provider: 'effect-harness',
          providers: {},
        }).pipe(Effect.provideService(FsService, fsService)),
      )

      assert.strictEqual(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /No active lifecycle provider/)
        assert.match(result.failure.message, /effect-harness/)
      }
    }))

    it.effect('runs status read-only without provider verification', () => Effect.gen(function* () {
      const calls: string[] = []
      const writes: string[] = []
      const fsService = makeFsMockService({
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

      const result = yield* runProviderLifecycleStatus({
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
      }).pipe(Effect.provideService(FsService, fsService))

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
    }))

    it.effect('runs provider verify with read-only update preflight', () => Effect.gen(function* () {
      const calls: string[] = []
      const writes: string[] = []
      const fsService = makeFsMockService({
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

      const result = yield* runProviderLifecycleVerify({
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
      }).pipe(Effect.provideService(FsService, fsService))

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
    }))

    it.effect('reports failed verify when a retained lifecycle surface is omitted from the provider plan', () =>
      Effect.gen(function* () {
        const writes: string[] = []
        const fsService = makeFsMockService({
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
        }).pipe(Effect.provideService(FsService, fsService))

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
        const fsService = makeFsMockService({
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
          }).pipe(Effect.provideService(FsService, fsService)),
        )

        assert.equal(result._tag, 'Failure')
        if (result._tag === 'Failure') {
          assert.match(result.failure.message, /omits active lifecycle surface/)
          assert.match(result.failure.message, /@effect~1tsgo/)
        }
        assert.deepEqual(writes, [])
      }))

    it.effect('effect-harness adapter returns declarative provider and managed-surface operations', () => Effect.gen(function* () {
      const provider = effectHarnessLifecycleProviderForDiscovery(effectHarnessDiscoveryFixture)
      const status = yield* provider.status(effectHarnessRecord)
      const verify = yield* provider.verify(effectHarnessRecord)
      const plan = yield* provider.planUpdate(effectHarnessRecord, { providerId: 'effect-harness' })

      assert.equal(status.providerId, 'effect-harness')
      assert.equal(status.status, 'ok')
      assert.equal(verify.status, 'passed')
      assert.ok(!plan.operations.some(operation => operation.path === '.prelude/providers/effect-harness/provider.json'))
      assert.ok(!plan.operations.some(operation => operation.path === '.effect-harness.json'))
      assert.ok(plan.operations.some(operation =>
        operation.kind === 'replaceStructuredPointer'
        && operation.path === 'package.json'
        && operation.pointer === '/scripts/typecheck'))
      assert.ok(plan.operations.some(operation =>
        operation.kind === 'replaceStructuredPointer'
        && operation.surfaceId === vscodeTypescriptAutoImportSurfaceId
        && operation.path === '.vscode/settings.json'
        && operation.pointer === '/typescript.preferences.autoImportFileExcludePatterns'))
      assert.ok(plan.operations.some(operation =>
        operation.kind === 'replaceStructuredPointer'
        && operation.surfaceId === zedAutoImportSurfaceId
        && operation.path === '.zed/settings.json'
        && operation.pointer === '/lsp/typescript-language-server/initialization_options/preferences/autoImportFileExcludePatterns'))
      assert.ok(plan.operations.some(operation =>
        operation.kind === 'replaceManagedBlock'
        && operation.surfaceId === eslintProviderHookSurfaceId
        && operation.path === 'eslint.config.mjs'))
      assert.deepEqual(plan.nextRecord?.surfaces.map(surface => surface.id), plan.operations.map((operation) => {
        if (operation.kind === 'replaceOwnedFile') {
          return `provider-managed-file:effect-harness:${operation.path}`
        }
        return operation.surfaceId
      }))
    }))

    it.effect('effect-harness adapter compares provider identity against discovery output', () => Effect.gen(function* () {
      const provider = effectHarnessLifecycleProviderForDiscovery(discoveredProvider)
      const record = effectHarnessProviderRecordForProjectedContext(discoveredProvider, effectHarnessRecord.projectedContext)

      const okStatus = yield* provider.status(record)
      const okVerify = yield* provider.verify(record)
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
      const staleStatus = yield* provider.status(staleRecord)
      const staleVerify = yield* provider.verify(staleRecord)
      assert.equal(staleStatus.status, 'changed')
      assert.equal(staleVerify.status, 'failed')
      assert.match(staleVerify.message ?? '', /discovered provider identity/u)
    }))

    it.effect('reports selected artifact, provider identity, profile, placement, and managed claims from lifecycle status and verify', () =>
      Effect.gen(function* () {
        const provider = effectHarnessLifecycleProviderForDiscovery(discoveredProvider)
        const record = effectHarnessProviderRecordForProjectedContext(
          discoveredProvider,
          effectHarnessRecord.projectedContext,
        )
        const discoveredReference = {
          ...effectHarnessReference,
          contractVersion: '7-test',
          providerVersion: '9.9.9-test',
        }
        const fsService = makeFsMockService({
          exists: () => Effect.succeed(true),
          readFileString: readLifecycleFiles({
            manifest: manifestJson({
              maintainProviders: [discoveredReference],
            }),
            providerRecord: record,
          }),
        })

        const status = yield* runProviderLifecycleStatus({
          targetDir: makeTargetDir('/project'),
          providers: {
            'effect-harness': provider,
          },
        }).pipe(Effect.provideService(FsService, fsService))
        const verify = yield* provider.verify(record)

        const statusProvider = status.providers[0] as unknown as Record<string, unknown>
        const verifyProvider = verify as unknown as Record<string, unknown>

        assert.equal(statusProvider.status, 'ok')
        assert.equal(verifyProvider.status, 'passed')
        assert.deepEqual(statusProvider.providerIdentity, {
          id: 'effect-harness',
          contractVersion: '7-test',
          providerVersion: '9.9.9-test',
        })
        assert.deepEqual(verifyProvider.providerIdentity, statusProvider.providerIdentity)
        assert.deepEqual(statusProvider.packageArtifactIdentity, discoveredProvider.packageArtifactIdentity)
        assert.deepEqual(verifyProvider.packageArtifactIdentity, discoveredProvider.packageArtifactIdentity)
        assert.equal(statusProvider.selectedProfile, 'codex-effect-v4')
        assert.equal(verifyProvider.selectedProfile, 'codex-effect-v4')

        const placementSummary = statusProvider.placementSummary as Record<string, unknown> | undefined
        assert.equal(placementSummary?.providerNamespacePath, '.prelude/providers/effect-harness')
        assert.equal(placementSummary?.targetTopology, 'single-package')
        assert.deepEqual(placementSummary?.effectRuntimePackageScopes, ['worker'])
        assert.deepEqual(placementSummary?.effectTestPackageScopes, ['worker'])
        assert.deepEqual(placementSummary?.tsconfigTargets, ['tsconfig.json'])
        assert.deepEqual(placementSummary?.editorSettingsTargets, ['.vscode/settings.json', '.zed/settings.json'])

        const managedClaims = statusProvider.managedClaims as readonly Record<string, unknown>[] | undefined
        assert.ok(managedClaims?.some(claim =>
          claim.slot === 'effect-runtime-package'
          && claim.locator === 'package.json#/dependencies/effect'))
        assert.ok(managedClaims?.some(claim =>
          claim.slot === 'effect-tsconfig'
          && claim.locator === 'tsconfig.json#/compilerOptions/plugins'))
        assert.deepEqual(verifyProvider.placementSummary, statusProvider.placementSummary)
        assert.deepEqual(verifyProvider.managedClaims, statusProvider.managedClaims)
      }))

    it.effect('recomputes desired provider records from selected artifact discovery and placement instead of stale provider-record base', () =>
      Effect.gen(function* () {
        const provider = effectHarnessLifecycleProviderForDiscovery(discoveredProvider)
        const record = effectHarnessProviderRecordForProjectedContext(
          discoveredProvider,
          effectHarnessRecord.projectedContext,
        )
        const staleRecord = {
          ...record,
          artifact: {
            ...record.artifact,
            packageArtifactIdentity: {
              ...discoveredProvider.packageArtifactIdentity,
              packageName: '@sayoriqwq/effect-harness',
              packageVersion: '0.0.0-stale',
              npmSelector: '@sayoriqwq/effect-harness@0.0.0-stale',
              neutralDiscoveryCommand: 'npx --yes --package @sayoriqwq/effect-harness@0.0.0-stale effect-harness provider-discover',
            },
          },
          placementSummary: {
            targetTopology: 'single-package',
            effectRuntimePackageScopes: ['legacy-record-base'],
            providerNamespacePath: '.prelude/providers/legacy-effect-harness',
          },
          surfaces: [
            structuredPointerSurface({
              base: '0.0.0-stale',
              snapshot: '0.0.0-stale',
            }),
          ],
        }

        const plan = yield* provider.planUpdate(staleRecord, { providerId: 'effect-harness' })
        const nextRecord = plan.nextRecord as unknown as {
          readonly artifact?: { readonly packageArtifactIdentity?: unknown }
          readonly placementSummary?: Record<string, unknown>
          readonly managedClaims?: readonly Record<string, unknown>[]
        }

        assert.deepEqual(nextRecord.artifact?.packageArtifactIdentity, discoveredProvider.packageArtifactIdentity)
        assert.equal(nextRecord.placementSummary?.targetTopology, 'single-package')
        assert.deepEqual(nextRecord.placementSummary?.effectRuntimePackageScopes, ['worker'])
        assert.equal(nextRecord.placementSummary?.providerNamespacePath, '.prelude/providers/effect-harness')
        assert.ok(nextRecord.managedClaims?.some(claim =>
          claim.slot === 'effect-runtime-package'
          && claim.locator === 'package.json#/dependencies/effect'))
        assert.ok(plan.operations.some(operation =>
          operation.kind === 'replaceStructuredPointer'
          && operation.path === 'package.json'
          && operation.pointer === tsgoPointer
          && operation.value === '0.15.0'))
      }))

    it.effect('projects the effect-harness first-party provider interface without source-entry surfaces', () => Effect.gen(function* () {
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
      assert.equal(record.runtime.commands.discover, effectHarnessDiscoveryFixture.packageLocator.discoveryCommand)
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
      assert.isTrue(surfacePaths.includes('eslint.config.mjs'))
      assert.isTrue(surfacePaths.includes('.vscode/settings.json'))
      assert.isTrue(surfacePaths.includes('.zed/settings.json'))
      assert.isTrue(surfacePaths.includes('.prelude/providers/effect-harness/eslint.config.mjs'))
      assert.isTrue(surfacePaths.includes('.prelude/providers/effect-harness/docs/discovery.md'))
      assert.isTrue(surfacePaths.includes('.prelude/providers/effect-harness/snippets/agents.md'))
      assert.isFalse(surfacePaths.some(surfacePath => surfacePath.startsWith('repos/')))
      assert.isFalse(surfacePaths.includes('.effect-harness.json'))
      assert.isFalse(surfacePaths.includes('AGENTS.md'))
      assert.isFalse(surfacePaths.some(surfacePath => surfacePath.startsWith('.codex/')))
      assert.isTrue(record.surfaces.some(surface => surface.kind === 'managedBlock' && surface.id === eslintProviderHookSurfaceId))
      const surfaceIds = new Set(record.surfaces.map(surface => surface.id))
      assert.isTrue(surfaceIds.has(vscodeTypescriptAutoImportSurfaceId))
      assert.isTrue(surfaceIds.has(vscodeJavascriptAutoImportSurfaceId))
      assert.isTrue(surfaceIds.has(vscodeWatchExcludeSurfaceId))
      assert.isTrue(surfaceIds.has(vscodeSearchExcludeSurfaceId))
      assert.isTrue(surfaceIds.has(zedAutoImportSurfaceId))
      assert.isTrue(surfaceIds.has(zedFileScanExclusionsSurfaceId))
      assert.isFalse([...surfaceIds].some(surfaceId => surfaceId.includes('/files.exclude')))
      const editorPolicy = jsonObject(contributionBuckets.editorPolicy)
      const editorPolicies = jsonObject(editorPolicy.policies)
      const autoImportExclude = jsonObject(editorPolicies.autoImportExclude)
      const vscodeAutoImportExclude = jsonObject(autoImportExclude.vscode)
      assert.deepEqual(vscodeAutoImportExclude, {
        'typescript.preferences.autoImportFileExcludePatterns': ['repos/**'],
        'javascript.preferences.autoImportFileExcludePatterns': ['repos/**'],
      })
      const zedAutoImportExclude = jsonObject(autoImportExclude.zed)
      const zedAutoImportLsp = jsonObject(zedAutoImportExclude.lsp)
      const zedTypeScriptLanguageServer = jsonObject(zedAutoImportLsp['typescript-language-server'])
      const zedInitializationOptions = jsonObject(zedTypeScriptLanguageServer.initialization_options)
      assert.deepEqual(jsonObject(zedInitializationOptions.preferences).autoImportFileExcludePatterns, ['repos/**'])
      assert.equal(jsonObject(editorPolicies.filesExclude).level, 'preference')

      const status = yield* provider.status(record)
      const verify = yield* provider.verify(record)
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
      const staleStatus = yield* provider.status(staleRuntimeRecord)
      const staleVerify = yield* provider.verify(staleRuntimeRecord)
      assert.equal(staleStatus.status, 'changed')
      assert.equal(staleVerify.status, 'failed')
      assert.match(staleVerify.message ?? '', /runtime metadata/u)
    }))

    it.effect('blocks unsupported provider contract transitions without a declarative migration plan', () => Effect.gen(function* () {
      const calls: string[] = []
      const fsService = makeFsMockService({
        exists: () => Effect.succeed(true),
        readFileString: readLifecycleFiles({
          manifest: manifestJson({
            maintainProviders: [effectHarnessReference],
          }),
        }),
      })

      const result = yield* Effect.result(
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
        }).pipe(Effect.provideService(FsService, fsService)),
      )

      assert.strictEqual(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /contract transition 1 -> 2 is unsupported/)
        assert.match(result.failure.message, /declarative migration plan/)
      }
      assert.deepEqual(calls, [])
    }))

    it.effect('blocks update plans that target undeclared external writes', () => Effect.gen(function* () {
      const fsService = makeFsMockService({
        exists: () => Effect.succeed(true),
        readFileString: readLifecycleFiles({
          manifest: manifestJson({
            maintainProviders: [effectHarnessReference],
          }),
          providerRecord: providerRecordWithSurfaces([]),
          fallback: '{ "scripts": { "build": "tsc --noEmit" } }\n',
        }),
      })

      const result = yield* Effect.result(
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
        }).pipe(Effect.provideService(FsService, fsService)),
      )

      assert.strictEqual(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /undeclared external lifecycle surface/)
        assert.match(result.failure.message, /package\.json/)
      }
    }))

    it.effect('allows newly declared owned provider surfaces from the next provider record', () => Effect.gen(function* () {
      const writes: Array<{ path: string, content: string }> = []
      const nextRecord = providerRecordWithSurfaces([
        ownedFileSurface({
          id: 'provider-notes',
          path: managedBlockPath,
          base: 'new provider notes\n',
          snapshot: 'new provider notes\n',
        }),
      ])
      const fsService = makeFsMockService({
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

      yield* runProviderLifecycleUpdate({
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
      }).pipe(Effect.provideService(FsService, fsService))

      assert.deepEqual(writes.map(write => write.path), [
        '/project/NOTES.md',
        '/project/.prelude/providers/effect-harness/provider.json',
        '/project/.prelude/manifest.json',
      ])
      assert.equal(writes[0]?.content, 'new provider notes\n')
    }))

    it.effect('blocks newly declared structured provider surfaces when an external value already differs', () => Effect.gen(function* () {
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
      const fsService = makeFsMockService({
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

      const result = yield* Effect.result(
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
        }).pipe(Effect.provideService(FsService, fsService)),
      )

      assert.strictEqual(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /cannot be adopted/)
        assert.match(result.failure.message, /package-manifest:root:\/scripts\/build/)
      }
      assert.deepEqual(writes, [])
    }))

    it.effect('updates provider namespace files while ignoring handed-off scaffold drift', () => Effect.gen(function* () {
      const calls: string[] = []
      const writes: Array<{ path: string, content: string }> = []
      const fsService = makeFsMockService({
        exists: () => Effect.succeed(true),
        readFileString: readLifecycleFiles({
          manifest: manifestJson({
            maintainProviders: [effectHarnessReference],
          }),
          providerRecord: providerRecordWithSurfaces([]),
          fallback: '{ "scripts": { "build": "user changed this handed-off scaffold" } }\n',
        }),
        writeFileString: (path, content) => Effect.sync(() => {
          writes.push({ path, content })
        }),
      })

      const result = yield* runProviderLifecycleUpdate({
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
      }).pipe(Effect.provideService(FsService, fsService))

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
    }))

    it.effect('blocks provider record references that point at invalid records', () =>
      Effect.gen(function* () {
        const writes: string[] = []
        const fsService = makeFsMockService({
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
          }).pipe(Effect.provideService(FsService, fsService)),
        )

        assert.equal(result._tag, 'Failure')
        if (result._tag === 'Failure') {
          assert.match(result.failure.message, /does not match manifest reference/)
        }
        assert.deepEqual(writes, [])
      }))

    it.effect('succeeds without rewriting a structured pointer when current already equals desired', () => Effect.gen(function* () {
      const writes: Array<{ path: string, content: string }> = []
      const fsService = makeFsMockService({
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

      const result = yield* runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers: registryWithOperations([
          replaceTsgoOperation('0.15.0'),
        ]),
      }).pipe(Effect.provideService(FsService, fsService))

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
      assert.match(writes[0]!.content, /"base":\s*"0\.15\.0"/)
      assert.match(writes[0]!.content, /"snapshot":\s*"0\.15\.0"/)
    }))

    it.effect('applies desired structured pointer value when current still equals provider record base', () => Effect.gen(function* () {
      const writes: Array<{ path: string, content: string }> = []
      const fsService = makeFsMockService({
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

      const result = yield* runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers: registryWithOperations([
          replaceTsgoOperation('0.15.0'),
        ]),
      }).pipe(Effect.provideService(FsService, fsService))

      assert.deepEqual(result.status, 'completed')
      assert.deepEqual(writes.map(write => write.path), [
        '/project/package.json',
        '/project/.prelude/providers/effect-harness/provider.json',
        '/project/.prelude/manifest.json',
      ])
      assert.match(writes[0]!.content, /"@effect\/tsgo":\s*"0\.15\.0"/)
      assert.match(writes[1]!.content, /"base":\s*"0\.15\.0"/)
    }))

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
        const pluginSnapshot = stringifyJson(desiredPlugins)
        const writes: Array<{ path: string, content: string }> = []
        const fsService = makeFsMockService({
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
        }).pipe(Effect.provideService(FsService, fsService))

        assert.deepEqual(result.status, 'completed')
        assert.deepEqual(writes.map(write => write.path), [
          '/project/.prelude/providers/effect-harness/provider.json',
          '/project/.prelude/manifest.json',
        ])
      }))

    it.effect('blocks update when a bounded structured pointer drifted', () => Effect.gen(function* () {
      const fsService = makeFsMockService({
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

      const result = yield* Effect.result(
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
        }).pipe(Effect.provideService(FsService, fsService)),
      )

      assert.strictEqual(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /drifted/)
        assert.match(result.failure.message, /@effect~1tsgo/)
      }
    }))

    it.effect('blocks structured pointer drift even when desired still equals provider record base', () => Effect.gen(function* () {
      const fsService = makeFsMockService({
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

      const result = yield* Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: registryWithOperations([
            replaceTsgoOperation('0.15.0'),
          ]),
        }).pipe(Effect.provideService(FsService, fsService)),
      )

      assert.strictEqual(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /drifted/)
        assert.match(result.failure.message, /current differs from provider record base and desired value/)
      }
    }))

    it.effect('updates a managed block while preserving surrounding file content', () => Effect.gen(function* () {
      const writes: Array<{ path: string, content: string }> = []
      const fsService = makeFsMockService({
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

      const result = yield* runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers: registryWithOperations([
          replaceManagedBlockOperation(updatedManagedBlock),
        ]),
      }).pipe(Effect.provideService(FsService, fsService))

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
      assert.match(writes[1]!.content, /"base":\s*"<!-- example:start -->\\nupdated provider instructions/u)
    }))

    it.effect('blocks update when a managed block drifted', () => Effect.gen(function* () {
      const fsService = makeFsMockService({
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

      const result = yield* Effect.result(
        runProviderLifecycleUpdate({
          targetDir: makeTargetDir('/project'),
          providers: registryWithOperations([
            replaceManagedBlockOperation(updatedManagedBlock),
          ]),
        }).pipe(Effect.provideService(FsService, fsService)),
      )

      assert.strictEqual(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /drifted/)
        assert.match(result.failure.message, /NOTES\.md/)
      }
    }))

    it.effect('blocks update when managed block markers are duplicated', () =>
      Effect.gen(function* () {
        const fsService = makeFsMockService({
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
          }).pipe(Effect.provideService(FsService, fsService)),
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
        const fsService = makeFsMockService({
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
          }).pipe(Effect.provideService(FsService, fsService)),
        )

        assert.equal(result._tag, 'Failure')
        if (result._tag === 'Failure') {
          assert.match(result.failure.message, /provider output is invalid/)
        }
        assert.deepEqual(writes.map(write => write.path), [])
      }))

    it.effect('blocks update when an owned external lifecycle file drifted', () => Effect.gen(function* () {
      const fsService = makeFsMockService({
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

      const result = yield* Effect.result(
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
        }).pipe(Effect.provideService(FsService, fsService)),
      )

      assert.strictEqual(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.match(result.failure.message, /drifted/)
        assert.match(result.failure.message, /NOTES\.md/)
      }
    }))

    it.effect('updates all providers by default and only the selected provider with --provider', () => Effect.gen(function* () {
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
      const fsService = makeFsMockService({
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

      yield* runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        providers,
      }).pipe(Effect.provideService(FsService, fsService))

      assert.deepEqual(calls, [
        'status:effect-harness',
        'planUpdate:effect-harness',
        'status:other-harness',
        'planUpdate:other-harness',
        'verify:effect-harness',
        'verify:other-harness',
      ])

      calls.length = 0
      yield* runProviderLifecycleUpdate({
        targetDir: makeTargetDir('/project'),
        provider: 'other-harness',
        providers,
      }).pipe(Effect.provideService(FsService, fsService))

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
    }))
  })
})
