import type { TargetDir } from '@/brand/target-dir'
import type { CreateFs, EffectHarnessProviderDiscovery, JsonValue, LifecycleProviderRecord, LifecycleSurfaceRecord, MaintainProviderReference, PreludeManifest } from '@/core/create'
import type { FileIOError } from '@/core/errors'
import * as path from 'node:path'
import { Effect, Schema } from 'effect'
import { EffectHarnessProviderDiscoveryService } from '@/core/create/effect-harness-discovery'
import {
  effectHarnessManagedBlockArtifact,
  effectHarnessManagedBlockSurfaceId,
  effectHarnessManagedFileArtifacts,
  effectHarnessManagedFileSurfaceId,
  effectHarnessPackageSurfacesForProjectedContext,
  effectHarnessProviderRecordForProjectedContext,
  effectHarnessTsconfigSurfacesForProjectedContext,
} from '@/core/create/effect-harness-provider'
import { extractManagedBlock, managedBlockCount, upsertManagedBlock } from '@/core/create/managed-block'
import { FsService } from '@/core/services/fs'

class LifecycleCommandError extends Schema.TaggedErrorClass<LifecycleCommandError>()('LifecycleCommandError', {
  message: Schema.String,
}) {}

export interface ProviderStatus {
  readonly providerId: string
  readonly status: 'ok' | 'changed' | 'blocked'
  readonly message?: string
}

export interface ProviderVerifyResult {
  readonly providerId: string
  readonly status: 'passed' | 'failed'
  readonly message?: string
}

export type ProviderUpdateOperation
  = | {
    readonly kind: 'replaceOwnedFile'
    readonly surfaceId: string
    readonly path: string
    readonly content: string
  }
  | {
    readonly kind: 'replaceManagedBlock'
    readonly surfaceId: string
    readonly path: string
    readonly startMarker: string
    readonly endMarker: string
    readonly content: string
  }
  | {
    readonly kind: 'replaceStructuredPointer'
    readonly surfaceId: string
    readonly path: string
    readonly pointer: string
    readonly value: JsonValue
  }

export interface ProviderUpdatePlan {
  readonly providerId: string
  readonly operations: readonly ProviderUpdateOperation[]
  readonly nextRecord?: LifecycleProviderRecord
}

export interface ProviderUpdateOptions {
  readonly providerId: string
}

export interface LifecycleProvider {
  readonly id: string
  readonly contractVersion: string
  readonly status: (record: LifecycleProviderRecord) => Effect.Effect<ProviderStatus, LifecycleCommandError, EffectHarnessProviderDiscoveryService>
  readonly verify: (record: LifecycleProviderRecord) => Effect.Effect<ProviderVerifyResult, LifecycleCommandError, EffectHarnessProviderDiscoveryService>
  readonly planUpdate: (
    record: LifecycleProviderRecord,
    options: ProviderUpdateOptions,
  ) => Effect.Effect<ProviderUpdatePlan, LifecycleCommandError, EffectHarnessProviderDiscoveryService>
}

interface StaticLifecycleProvider {
  readonly id: string
  readonly contractVersion: string
  readonly status: (record: LifecycleProviderRecord) => Effect.Effect<ProviderStatus, LifecycleCommandError>
  readonly verify: (record: LifecycleProviderRecord) => Effect.Effect<ProviderVerifyResult, LifecycleCommandError>
  readonly planUpdate: (
    record: LifecycleProviderRecord,
    options: ProviderUpdateOptions,
  ) => Effect.Effect<ProviderUpdatePlan, LifecycleCommandError>
}

export type LifecycleProviderRegistry = Record<string, LifecycleProvider>

function jsonMatches(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function missingEffectHarnessSurfaceIds(discovery: EffectHarnessProviderDiscovery, record: LifecycleProviderRecord) {
  const expected = desiredEffectHarnessRecord(discovery, record).surfaces.map(surface => surface.id)
  const actual = record.surfaces.map(surface => surface.id)
  return expected.filter(surfaceId => !actual.includes(surfaceId))
}

function surfaceDescriptor(surface: LifecycleSurfaceRecord) {
  const descriptor: Record<string, unknown> = { ...surface }
  delete descriptor.base
  delete descriptor.snapshot
  return descriptor
}

function desiredEffectHarnessRecord(discovery: EffectHarnessProviderDiscovery, record: LifecycleProviderRecord): LifecycleProviderRecord {
  return effectHarnessProviderRecordForProjectedContext(discovery, record.projectedContext)
}

function effectHarnessRecordProfileIssues(discovery: EffectHarnessProviderDiscovery, record: LifecycleProviderRecord) {
  const desired = desiredEffectHarnessRecord(discovery, record)
  const issues: string[] = []

  if (record.providerVersion !== desired.providerVersion || record.profile !== desired.profile) {
    issues.push('provider profile identity differs from discovered provider identity')
  }

  if (!jsonMatches(record.artifact, desired.artifact)) {
    issues.push('provider artifact identity differs from discovered provider identity')
  }

  if (!jsonMatches(record.options, desired.options)) {
    issues.push('provider options differ from current effect-harness profile')
  }

  if (!jsonMatches(record.runtime, desired.runtime)) {
    issues.push('provider runtime metadata differs from current effect-harness profile')
  }

  const missingSurfaceIds = missingEffectHarnessSurfaceIds(discovery, record)
  if (missingSurfaceIds.length > 0) {
    issues.push(`provider record is missing managed surfaces: ${missingSurfaceIds.join(', ')}`)
  }

  const desiredSurfaceIds = new Set(desired.surfaces.map(surface => surface.id))
  const extraSurfaceIds = record.surfaces.map(surface => surface.id).filter(surfaceId => !desiredSurfaceIds.has(surfaceId))
  if (extraSurfaceIds.length > 0) {
    issues.push(`provider record contains retired managed surfaces: ${extraSurfaceIds.join(', ')}`)
  }

  if (!jsonMatches(record.surfaces.map(surfaceDescriptor), desired.surfaces.map(surfaceDescriptor))) {
    issues.push('provider managed surface declarations differ from current effect-harness profile')
  }

  return issues
}

function desiredEffectHarnessOperations(record: LifecycleProviderRecord): readonly ProviderUpdateOperation[] {
  return [
    ...effectHarnessPackageSurfacesForProjectedContext(record.projectedContext).map(surface => ({
      kind: 'replaceStructuredPointer' as const,
      surfaceId: surface.id,
      path: 'package.json',
      pointer: surface.pointer,
      value: surface.value,
    })),
    ...effectHarnessTsconfigSurfacesForProjectedContext(record.projectedContext).map(surface => ({
      kind: 'replaceStructuredPointer' as const,
      surfaceId: surface.id,
      path: 'tsconfig.json',
      pointer: surface.pointer,
      value: surface.value,
    })),
    ...effectHarnessManagedFileArtifacts().map(artifact => ({
      kind: 'replaceOwnedFile' as const,
      surfaceId: effectHarnessManagedFileSurfaceId(artifact.path),
      path: artifact.path,
      content: artifact.content,
    })),
    {
      kind: 'replaceManagedBlock',
      surfaceId: effectHarnessManagedBlockSurfaceId,
      path: effectHarnessManagedBlockArtifact().path,
      startMarker: effectHarnessManagedBlockArtifact().startMarker,
      endMarker: effectHarnessManagedBlockArtifact().endMarker,
      content: effectHarnessManagedBlockArtifact().content,
    },
  ]
}

function effectHarnessStatusForDiscovery(discovery: EffectHarnessProviderDiscovery) {
  return Effect.fn('effectHarnessStatus')(
    function* (record: LifecycleProviderRecord): Effect.fn.Return<ProviderStatus, LifecycleCommandError> {
      const issues = effectHarnessRecordProfileIssues(discovery, record)

      return {
        providerId: record.id,
        status: issues.length === 0 ? 'ok' : 'changed',
        ...(issues.length === 0 ? {} : { message: issues.join('; ') }),
      }
    },
  )
}

function effectHarnessVerifyForDiscovery(discovery: EffectHarnessProviderDiscovery) {
  return Effect.fn('effectHarnessVerify')(
    function* (record: LifecycleProviderRecord): Effect.fn.Return<ProviderVerifyResult, LifecycleCommandError> {
      const issues = record.contractVersion === discovery.provider.contractVersion
        ? effectHarnessRecordProfileIssues(discovery, record)
        : [`effect-harness contract version ${record.contractVersion} is unsupported by discovered contract ${discovery.provider.contractVersion}`]

      return issues.length === 0
        ? {
            providerId: record.id,
            status: 'passed' as const,
          }
        : {
            providerId: record.id,
            status: 'failed' as const,
            message: `effect-harness lifecycle provider record does not match discovered provider identity: ${issues.join('; ')}`,
          }
    },
  )
}

function planEffectHarnessUpdateForDiscovery(discovery: EffectHarnessProviderDiscovery) {
  return Effect.fn('planEffectHarnessUpdate')(
    function* (record: LifecycleProviderRecord): Effect.fn.Return<ProviderUpdatePlan, LifecycleCommandError> {
      return {
        providerId: record.id,
        operations: desiredEffectHarnessOperations(record),
        nextRecord: desiredEffectHarnessRecord(discovery, record),
      }
    },
  )
}

function withDiscoveredEffectHarness<A>(
  f: (discovery: EffectHarnessProviderDiscovery) => Effect.Effect<A, LifecycleCommandError>,
): Effect.Effect<A, LifecycleCommandError, EffectHarnessProviderDiscoveryService> {
  return Effect.gen(function* () {
    const discoveryService = yield* EffectHarnessProviderDiscoveryService
    const discovery = yield* discoveryService.discover.pipe(
      Effect.mapError(error => new LifecycleCommandError({ message: error.message })),
    )
    return yield* f(discovery)
  })
}

export function effectHarnessLifecycleProviderForDiscovery(discovery: EffectHarnessProviderDiscovery): StaticLifecycleProvider {
  return {
    id: discovery.provider.id,
    contractVersion: discovery.provider.contractVersion,
    status: effectHarnessStatusForDiscovery(discovery),
    verify: effectHarnessVerifyForDiscovery(discovery),
    planUpdate: planEffectHarnessUpdateForDiscovery(discovery),
  }
}

export const effectHarnessLifecycleProvider: LifecycleProvider = {
  id: 'effect-harness',
  contractVersion: 'discovered',
  status: record => withDiscoveredEffectHarness(discovery => effectHarnessStatusForDiscovery(discovery)(record)),
  verify: record => withDiscoveredEffectHarness(discovery => effectHarnessVerifyForDiscovery(discovery)(record)),
  planUpdate: record => withDiscoveredEffectHarness(discovery => planEffectHarnessUpdateForDiscovery(discovery)(record)),
}

export interface ProviderLifecycleCommandOptions {
  readonly targetDir: TargetDir
  readonly provider?: string
  readonly providers: LifecycleProviderRegistry
}

export interface ProviderLifecycleStatusResult {
  readonly command: 'status'
  readonly status: 'noop' | 'completed'
  readonly providers: readonly ProviderStatus[]
}

export interface ProviderLifecycleVerifyResult {
  readonly command: 'verify'
  readonly status: 'noop' | 'completed'
  readonly providers: readonly ProviderVerifyResult[]
}

export interface ProviderLifecycleUpdateResult {
  readonly command: 'update'
  readonly status: 'noop' | 'completed'
  readonly providers: readonly ProviderVerifyResult[]
}

export type ManagedSurfaceReconcileResult
  = | { readonly status: 'alreadyApplied' }
    | { readonly status: 'apply' }
    | { readonly status: 'drift' }

const manifestRelativePath = '.prelude/manifest.json'

function manifestPath(targetDir: TargetDir) {
  return path.join(targetDir, manifestRelativePath)
}

const readManifest = Effect.fn('readManifest')(
  function* (targetDir: TargetDir): Effect.fn.Return<PreludeManifest, LifecycleCommandError | FileIOError, FsService> {
    const fs = yield* FsService
    const targetPath = manifestPath(targetDir)
    const exists = yield* fs.exists(targetPath)

    if (!exists) {
      return yield* new LifecycleCommandError({
        message: `No prelude manifest found at ${manifestRelativePath}`,
      })
    }

    const content = yield* fs.readFileString(targetPath)
    const manifest = yield* Effect.try({
      try: () => JSON.parse(content) as PreludeManifest,
      catch: error => new LifecycleCommandError({
        message: `Invalid prelude manifest at ${manifestRelativePath}: ${String(error)}`,
      }),
    })

    if (manifest.schemaVersion !== 1) {
      return yield* new LifecycleCommandError({
        message: `Unsupported prelude manifest schema at ${manifestRelativePath}`,
      })
    }

    if (!Array.isArray(manifest.maintainProviders)) {
      return yield* new LifecycleCommandError({
        message: `Invalid prelude manifest maintain provider records at ${manifestRelativePath}`,
      })
    }

    return manifest
  },
)

const readProviderRecord = Effect.fn('readProviderRecord')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    reference: MaintainProviderReference,
  ): Effect.fn.Return<LifecycleProviderRecord, LifecycleCommandError | FileIOError> {
    const recordPath = targetPath(targetDir, reference.recordPath)
    const content = yield* fs.readFileString(recordPath)
    const record = yield* Effect.try({
      try: () => JSON.parse(content) as LifecycleProviderRecord,
      catch: error => new LifecycleCommandError({
        message: `Invalid provider record at ${reference.recordPath}: ${String(error)}`,
      }),
    })

    if (record.schemaVersion !== 1 || record.id !== reference.id || record.contractVersion !== reference.contractVersion) {
      return yield* new LifecycleCommandError({
        message: `Provider record ${reference.recordPath} does not match manifest reference ${reference.id}`,
      })
    }

    if (!Array.isArray(record.surfaces)) {
      return yield* new LifecycleCommandError({
        message: `Invalid provider surfaces at ${reference.recordPath}`,
      })
    }

    return record
  },
)

function encodeManifest(manifest: PreludeManifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

function encodeProviderRecord(record: LifecycleProviderRecord) {
  return `${JSON.stringify(record, null, 2)}\n`
}

function targetPath(targetDir: TargetDir, relativePath: string) {
  return path.join(targetDir, relativePath)
}

export function reconcileManagedLogicalValue(input: {
  readonly base: string
  readonly current: string
  readonly desired: string
}): ManagedSurfaceReconcileResult {
  if (input.current === input.desired) {
    return { status: 'alreadyApplied' }
  }

  if (input.current === input.base) {
    return { status: 'apply' }
  }

  return { status: 'drift' }
}

function providerOwner(providerId: string) {
  return `provider:${providerId}`
}

function surfaceBase(surface: LifecycleSurfaceRecord) {
  return surface.base ?? surface.snapshot
}

function findDeclaredSurface(
  record: LifecycleProviderRecord,
  operation: ProviderUpdateOperation,
): Effect.Effect<LifecycleSurfaceRecord, LifecycleCommandError> {
  const surface = record.surfaces.find(candidate => candidate.id === operation.surfaceId)

  if (surface === undefined || surface.owner !== providerOwner(record.id)) {
    return Effect.fail(new LifecycleCommandError({
      message: `Provider ${record.id} update targets undeclared external lifecycle surface ${operation.surfaceId} at ${operation.path}`,
    }))
  }

  return Effect.succeed(surface)
}

function decodeJsonPointerSegment(segment: string) {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~')
}

function isJsonObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
}

function pointerParts(pointer: string): Effect.Effect<readonly string[], LifecycleCommandError> {
  if (pointer === '') {
    return Effect.succeed([])
  }

  if (!pointer.startsWith('/')) {
    return Effect.fail(new LifecycleCommandError({
      message: `Unsupported structured pointer ${pointer}`,
    }))
  }

  return Effect.succeed(pointer.slice(1).split('/').map(decodeJsonPointerSegment))
}

const readPointer = Effect.fn('readPointer')(
  function* (value: JsonValue, pointer: string): Effect.fn.Return<JsonValue | undefined, LifecycleCommandError> {
    const parts = yield* pointerParts(pointer)
    let current: JsonValue | undefined = value

    for (const part of parts) {
      if (!isJsonObject(current)) {
        return undefined
      }

      current = current[part]
    }

    return current
  },
)

const writePointer = Effect.fn('writePointer')(
  function* (value: JsonValue, pointer: string, nextValue: JsonValue): Effect.fn.Return<JsonValue, LifecycleCommandError> {
    const parts = yield* pointerParts(pointer)

    if (parts.length === 0) {
      return nextValue
    }

    if (!isJsonObject(value)) {
      return yield* new LifecycleCommandError({
        message: `Cannot write structured pointer ${pointer} into non-object JSON`,
      })
    }

    const root = { ...value } as Record<string, JsonValue>
    let current = root

    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index]!
      const child = current[part]

      if (child === null || typeof child !== 'object' || Array.isArray(child)) {
        current[part] = {}
      }
      else {
        current[part] = { ...child }
      }

      current = current[part] as Record<string, JsonValue>
    }

    current[parts[parts.length - 1]!] = nextValue

    return root
  },
)

function canonicalJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(canonicalJsonValue)
  }

  if (isJsonObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalJsonValue(nestedValue)]),
    )
  }

  return value
}

function snapshotOf(value: JsonValue | undefined) {
  if (value === undefined) {
    return undefined
  }

  return typeof value === 'string' ? value : JSON.stringify(canonicalJsonValue(value))
}

function parseJsonFile(content: string, relativePath: string): Effect.Effect<JsonValue, LifecycleCommandError> {
  try {
    const parsed = JSON.parse(content) as JsonValue
    return Effect.succeed(parsed)
  }
  catch (error) {
    return Effect.fail(new LifecycleCommandError({
      message: `Could not parse lifecycle structured surface ${relativePath}: ${String(error)}`,
    }))
  }
}

function reconcileOrBlock(input: {
  readonly surface: LifecycleSurfaceRecord
  readonly path: string
  readonly base: string
  readonly current: string
  readonly desired: string
}): Effect.Effect<Exclude<ManagedSurfaceReconcileResult, { readonly status: 'drift' }>, LifecycleCommandError> {
  const decision = reconcileManagedLogicalValue(input)

  if (decision.status === 'drift') {
    return Effect.fail(new LifecycleCommandError({
      message: `Lifecycle surface ${input.surface.id} at ${input.path} drifted; current differs from provider record base and desired value`,
    }))
  }

  return Effect.succeed(decision)
}

const preflightOperation = Effect.fn('preflightOperation')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    record: LifecycleProviderRecord,
    operation: ProviderUpdateOperation,
  ): Effect.fn.Return<Exclude<ManagedSurfaceReconcileResult, { readonly status: 'drift' }>, LifecycleCommandError | FileIOError> {
    const surface = yield* findDeclaredSurface(record, operation)

    if (operation.kind === 'replaceOwnedFile') {
      if (surface.kind !== 'ownedFile' || surface.authority !== 'owner' || surface.path !== operation.path) {
        return yield* new LifecycleCommandError({
          message: `Provider ${record.id} update operation does not match declared owned lifecycle surface ${operation.surfaceId}`,
        })
      }

      const base = surfaceBase(surface)
      if (base === undefined) {
        return yield* new LifecycleCommandError({
          message: `Provider ${record.id} owned lifecycle surface ${operation.surfaceId} has no base snapshot`,
        })
      }

      const current = yield* fs.readFileString(targetPath(targetDir, operation.path))
      return yield* reconcileOrBlock({
        surface,
        path: operation.path,
        base,
        current,
        desired: operation.content,
      })
    }

    if (operation.kind === 'replaceManagedBlock') {
      if (
        surface.kind !== 'managedBlock'
        || surface.authority !== 'bounded'
        || surface.path !== operation.path
        || surface.startMarker !== operation.startMarker
        || surface.endMarker !== operation.endMarker
      ) {
        return yield* new LifecycleCommandError({
          message: `Provider ${record.id} update operation does not match declared managed block lifecycle surface ${operation.surfaceId}`,
        })
      }

      const base = surfaceBase(surface)
      if (base === undefined) {
        return yield* new LifecycleCommandError({
          message: `Provider ${record.id} managed block lifecycle surface ${operation.surfaceId} has no base snapshot`,
        })
      }

      const currentFile = yield* fs.readFileString(targetPath(targetDir, operation.path))
      const blockCount = managedBlockCount(currentFile, operation)
      if (blockCount > 1) {
        return yield* new LifecycleCommandError({
          message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} drifted; managed block markers are duplicated`,
        })
      }

      const current = extractManagedBlock(currentFile, operation)
      if (current === undefined) {
        return yield* new LifecycleCommandError({
          message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} drifted; managed block markers are missing`,
        })
      }

      return yield* reconcileOrBlock({
        surface,
        path: operation.path,
        base,
        current,
        desired: operation.content,
      })
    }

    if (surface.kind !== 'structuredPointer' || surface.authority !== 'bounded' || surface.path !== operation.path || surface.pointer !== operation.pointer) {
      return yield* new LifecycleCommandError({
        message: `Provider ${record.id} update operation does not match declared structured lifecycle surface ${operation.surfaceId}`,
      })
    }

    const content = yield* fs.readFileString(targetPath(targetDir, operation.path))
    const json = yield* parseJsonFile(content, operation.path)
    const current = yield* readPointer(json, operation.pointer)
    const currentSnapshot = snapshotOf(current)
    const desiredSnapshot = snapshotOf(operation.value)
    const base = surfaceBase(surface)

    if (base === undefined || currentSnapshot === undefined || desiredSnapshot === undefined) {
      return yield* new LifecycleCommandError({
        message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} cannot be reconciled because the logical value is missing`,
      })
    }

    return yield* reconcileOrBlock({
      surface,
      path: operation.path,
      base,
      current: currentSnapshot,
      desired: desiredSnapshot,
    })
  },
)

const applyOperation = Effect.fn('applyOperation')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    operation: ProviderUpdateOperation,
  ): Effect.fn.Return<void, LifecycleCommandError | FileIOError> {
    if (operation.kind === 'replaceOwnedFile') {
      const pathToWrite = targetPath(targetDir, operation.path)
      yield* fs.ensureDir(path.dirname(pathToWrite))
      yield* fs.writeFileString(pathToWrite, operation.content)
      return
    }

    if (operation.kind === 'replaceManagedBlock') {
      const pathToWrite = targetPath(targetDir, operation.path)
      const current = yield* fs.readFileString(pathToWrite)
      yield* fs.ensureDir(path.dirname(pathToWrite))
      yield* fs.writeFileString(pathToWrite, upsertManagedBlock(current, operation, operation.content))
      return
    }

    const pathToWrite = targetPath(targetDir, operation.path)
    const content = yield* fs.readFileString(pathToWrite)
    const json = yield* parseJsonFile(content, operation.path)
    const nextJson = yield* writePointer(json, operation.pointer, operation.value)

    if (!isJsonObject(nextJson)) {
      return yield* new LifecycleCommandError({
        message: `Structured lifecycle surface ${operation.path} must remain a JSON object`,
      })
    }

    yield* fs.writeFileString(pathToWrite, `${JSON.stringify(nextJson, null, 2)}\n`)
  },
)

function applyManifestUpdates(
  manifest: PreludeManifest,
  plannedUpdates: readonly {
    readonly reference: MaintainProviderReference
    readonly record: LifecycleProviderRecord
    readonly plan: ProviderUpdatePlan
  }[],
) {
  const nextManifest = JSON.parse(JSON.stringify(manifest)) as PreludeManifest
  const providers = [...nextManifest.maintainProviders]

  for (const update of plannedUpdates) {
    const nextRecord = nextRecordForPlan(update.record, update.plan)
    const providerIndex = providers.findIndex(record => record.id === update.reference.id)
    if (providerIndex >= 0) {
      providers[providerIndex] = {
        ...update.reference,
        contractVersion: nextRecord.contractVersion,
        providerVersion: nextRecord.providerVersion,
        profile: nextRecord.profile,
      }
    }
  }

  return {
    ...nextManifest,
    maintainProviders: providers,
  }
}

function nextRecordForPlan(record: LifecycleProviderRecord, plan: ProviderUpdatePlan): LifecycleProviderRecord {
  const nextRecord = plan.nextRecord ?? record

  const surfaces = nextRecord.surfaces.map((surface) => {
    const operation = plan.operations.find(candidate => candidate.surfaceId === surface.id)

    if (operation === undefined) {
      return surface
    }

    if (operation.kind === 'replaceOwnedFile' && surface.kind === 'ownedFile') {
      return {
        ...surface,
        base: operation.content,
        snapshot: operation.content,
      }
    }

    if (operation.kind === 'replaceManagedBlock' && surface.kind === 'managedBlock') {
      return {
        ...surface,
        base: operation.content,
        snapshot: operation.content,
      }
    }

    if (operation.kind === 'replaceStructuredPointer' && surface.kind === 'structuredPointer') {
      const snapshot = snapshotOf(operation.value)!
      return {
        ...surface,
        base: snapshot,
        snapshot,
      }
    }

    return surface
  })

  return {
    ...nextRecord,
    surfaces,
  }
}

function selectProviderReferences(
  manifest: PreludeManifest,
  providerId: string | undefined,
): Effect.Effect<readonly MaintainProviderReference[], LifecycleCommandError> {
  const records = manifest.maintainProviders

  if (providerId !== undefined) {
    const record = records.find(candidate => candidate.id === providerId)
    if (record === undefined) {
      return Effect.fail(new LifecycleCommandError({
        message: `No active lifecycle provider found for --provider ${providerId}`,
      }))
    }

    return Effect.succeed([record])
  }

  return Effect.succeed(records)
}

function providerFor(
  registry: LifecycleProviderRegistry,
  record: LifecycleProviderRecord,
): Effect.Effect<LifecycleProvider, LifecycleCommandError> {
  const provider = registry[record.id]

  if (provider === undefined) {
    return Effect.fail(new LifecycleCommandError({
      message: `No lifecycle provider adapter registered for ${record.id}`,
    }))
  }

  if (provider.contractVersion !== 'discovered' && provider.contractVersion !== record.contractVersion) {
    return Effect.fail(new LifecycleCommandError({
      message: `Lifecycle provider ${record.id} contract transition ${record.contractVersion} -> ${provider.contractVersion} is unsupported; no declarative migration plan is registered`,
    }))
  }

  return Effect.succeed(provider)
}

function operationSurfaceIds(
  operation: ProviderUpdateOperation,
) {
  return [operation.surfaceId]
}

function retainedLifecycleSurfaceIds(
  record: LifecycleProviderRecord,
  plan: ProviderUpdatePlan,
) {
  const nextSurfaceIds = (plan.nextRecord?.surfaces ?? record.surfaces).map(surface => surface.id)
  return record.surfaces.map(surface => surface.id).filter(surfaceId => nextSurfaceIds.includes(surfaceId))
}

function missingPlannedSurfaceIds(
  record: LifecycleProviderRecord,
  plan: ProviderUpdatePlan,
) {
  const coveredSurfaceIds = new Set(
    plan.operations.flatMap(operation => operationSurfaceIds(operation)),
  )

  return retainedLifecycleSurfaceIds(record, plan)
    .filter(surfaceId => !coveredSurfaceIds.has(surfaceId))
}

function planCoverageMessage(record: LifecycleProviderRecord, missingSurfaceIds: readonly string[]) {
  return `Provider ${record.id} update plan omits active lifecycle surface(s): ${missingSurfaceIds.join(', ')}`
}

function verifyFailureMessage(record: LifecycleProviderRecord, result: ProviderVerifyResult) {
  return result.message ?? `Provider ${record.id} verification failed`
}

function assertProviderVerifyPassed(record: LifecycleProviderRecord, result: ProviderVerifyResult): Effect.Effect<void, LifecycleCommandError> {
  if (result.status === 'failed') {
    return Effect.fail(new LifecycleCommandError({
      message: verifyFailureMessage(record, result),
    }))
  }

  return Effect.void
}

function assertPlanCoversRetainedSurfaces(
  record: LifecycleProviderRecord,
  plan: ProviderUpdatePlan,
): Effect.Effect<void, LifecycleCommandError> {
  const missingSurfaceIds = missingPlannedSurfaceIds(record, plan)

  if (missingSurfaceIds.length > 0) {
    return Effect.fail(new LifecycleCommandError({
      message: planCoverageMessage(record, missingSurfaceIds),
    }))
  }

  return Effect.void
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function operationLocator(operation: ProviderUpdateOperation) {
  if (operation.kind === 'replaceStructuredPointer') {
    return `${operation.path}#${operation.pointer}`
  }

  return operation.path
}

const verifyProviderCurrentState = Effect.fn('verifyProviderCurrentState')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    record: LifecycleProviderRecord,
    provider: LifecycleProvider,
  ): Effect.fn.Return<ProviderVerifyResult, LifecycleCommandError | FileIOError, EffectHarnessProviderDiscoveryService> {
    const providerResult = yield* provider.verify(record)

    if (providerResult.status === 'failed') {
      return providerResult
    }

    const plan = yield* provider.planUpdate(record, { providerId: record.id })
    const missingSurfaceIds = missingPlannedSurfaceIds(record, plan)
    if (missingSurfaceIds.length > 0) {
      return {
        providerId: record.id,
        status: 'failed',
        message: planCoverageMessage(record, missingSurfaceIds),
      }
    }

    const preflightResults = yield* Effect.forEach(
      plan.operations,
      operation =>
        preflightOperation(fs, targetDir, record, operation).pipe(
          Effect.result,
          Effect.map(result => ({ operation, result })),
        ),
      { concurrency: 1 },
    )

    for (const preflightResult of preflightResults) {
      if (preflightResult.result._tag === 'Failure') {
        return {
          providerId: record.id,
          status: 'failed',
          message: errorMessage(preflightResult.result.failure),
        }
      }

      if (preflightResult.result.success.status === 'apply') {
        return {
          providerId: record.id,
          status: 'failed',
          message: `Provider ${record.id} lifecycle surface ${operationLocator(preflightResult.operation)} is not up to date`,
        }
      }
    }

    return providerResult
  },
)

export const runProviderLifecycleStatus = Effect.fn('runProviderLifecycleStatus')(
  function* (options: ProviderLifecycleCommandOptions): Effect.fn.Return<ProviderLifecycleStatusResult, LifecycleCommandError | FileIOError, FsService | EffectHarnessProviderDiscoveryService> {
    const fs = yield* FsService
    const manifest = yield* readManifest(options.targetDir)
    const references = yield* selectProviderReferences(manifest, options.provider)

    if (references.length === 0) {
      return {
        command: 'status',
        status: 'noop',
        providers: [],
      }
    }

    const providers = yield* Effect.forEach(references, reference =>
      Effect.gen(function* () {
        const record = yield* readProviderRecord(fs, options.targetDir, reference)
        const provider = yield* providerFor(options.providers, record)
        return yield* provider.status(record)
      }))

    return {
      command: 'status',
      status: 'completed',
      providers,
    }
  },
)

export const runProviderLifecycleVerify = Effect.fn('runProviderLifecycleVerify')(
  function* (options: ProviderLifecycleCommandOptions): Effect.fn.Return<ProviderLifecycleVerifyResult, LifecycleCommandError | FileIOError, FsService | EffectHarnessProviderDiscoveryService> {
    const fs = yield* FsService
    const manifest = yield* readManifest(options.targetDir)
    const references = yield* selectProviderReferences(manifest, options.provider)

    if (references.length === 0) {
      return {
        command: 'verify',
        status: 'noop',
        providers: [],
      }
    }

    const providers = yield* Effect.forEach(references, reference =>
      Effect.gen(function* () {
        const record = yield* readProviderRecord(fs, options.targetDir, reference)
        const provider = yield* providerFor(options.providers, record)
        return yield* verifyProviderCurrentState(fs, options.targetDir, record, provider)
      }))

    return {
      command: 'verify',
      status: 'completed',
      providers,
    }
  },
)

export const runProviderLifecycleUpdate = Effect.fn('runProviderLifecycleUpdate')(
  function* (options: ProviderLifecycleCommandOptions): Effect.fn.Return<ProviderLifecycleUpdateResult, LifecycleCommandError | FileIOError, FsService | EffectHarnessProviderDiscoveryService> {
    const fs = yield* FsService
    const manifest = yield* readManifest(options.targetDir)
    const references = yield* selectProviderReferences(manifest, options.provider)

    if (references.length === 0) {
      return {
        command: 'update',
        status: 'noop',
        providers: [],
      }
    }

    const plannedUpdates = yield* Effect.forEach(references, reference =>
      Effect.gen(function* () {
        const record = yield* readProviderRecord(fs, options.targetDir, reference)
        const provider = yield* providerFor(options.providers, record)
        yield* provider.status(record)
        const plan = yield* provider.planUpdate(record, { providerId: record.id })
        yield* assertPlanCoversRetainedSurfaces(record, plan)
        return { provider, reference, record, plan }
      }), { concurrency: 1 })

    const preflightedUpdates = yield* Effect.forEach(
      plannedUpdates,
      update =>
        Effect.gen(function* () {
          const operations = yield* Effect.forEach(
            update.plan.operations,
            operation =>
              preflightOperation(fs, options.targetDir, update.record, operation).pipe(
                Effect.map(decision => ({ decision, operation })),
              ),
            { concurrency: 1 },
          )

          return {
            ...update,
            operations,
          }
        }),
      { concurrency: 1 },
    )

    yield* Effect.forEach(
      preflightedUpdates,
      update =>
        Effect.forEach(
          update.operations.filter(operation => operation.decision.status === 'apply'),
          operation => applyOperation(fs, options.targetDir, operation.operation),
          { concurrency: 1, discard: true },
        ),
      { concurrency: 1, discard: true },
    )

    const nextManifest = applyManifestUpdates(manifest, plannedUpdates)

    const providers = yield* Effect.forEach(plannedUpdates, (update) => {
      const nextRecord = nextRecordForPlan(update.record, update.plan)
      return update.provider.verify(nextRecord)
    }, { concurrency: 1 })

    for (let index = 0; index < plannedUpdates.length; index += 1) {
      yield* assertProviderVerifyPassed(plannedUpdates[index]!.record, providers[index]!)
    }

    yield* Effect.forEach(plannedUpdates, (update) => {
      const nextRecord = nextRecordForPlan(update.record, update.plan)
      const pathToRecord = targetPath(options.targetDir, update.reference.recordPath)
      return Effect.gen(function* () {
        yield* fs.ensureDir(path.dirname(pathToRecord))
        yield* fs.writeFileString(pathToRecord, encodeProviderRecord(nextRecord))
      })
    }, { concurrency: 1, discard: true })

    const pathToManifest = manifestPath(options.targetDir)
    yield* fs.ensureDir(path.dirname(pathToManifest))
    yield* fs.writeFileString(pathToManifest, encodeManifest(nextManifest))

    return {
      command: 'update',
      status: 'completed',
      providers,
    }
  },
)
