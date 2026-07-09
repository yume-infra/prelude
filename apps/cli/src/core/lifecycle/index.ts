import type { TargetDir } from '@/brand/target-dir'
import type { CreateFs, EffectHarnessProviderDiscovery, JsonValue, LifecycleProviderRecord, LifecycleSurfaceRecord, MaintainProviderReference, PreludeManifest } from '@/core/create'
import type { FileIOError } from '@/core/errors'
import { Effect, Schema } from 'effect'
import stripJsonComments from 'strip-json-comments'
import { EffectHarnessProviderDiscoveryService } from '@/core/create/effect-harness-discovery'
import {
  effectHarnessMaintainProviderReference,
  effectHarnessProviderRecordForProjectedContext,
  effectHarnessVerificationRecord,
} from '@/core/create/effect-harness-provider'
import { extractManagedBlock, managedBlockCount, upsertManagedBlock } from '@/core/create/managed-block'
import { pathDirname, pathJoin } from '@/core/path-utils'
import { FsService } from '@/core/services/fs'

const decodeJsonString = Schema.decodeUnknownSync(Schema.UnknownFromJsonString)
const encodeJsonString = Schema.encodeUnknownSync(Schema.UnknownFromJsonString)

class LifecycleCommandError extends Schema.TaggedErrorClass<LifecycleCommandError>()('LifecycleCommandError', {
  message: Schema.String,
}) {}

export interface ProviderStatus {
  readonly providerId: string
  readonly status: 'ok' | 'changed' | 'blocked'
  readonly message?: string
  readonly providerIdentity?: {
    readonly id: string
    readonly contractVersion: string
    readonly providerVersion: string
  }
  readonly packageArtifactIdentity?: Record<string, JsonValue>
  readonly selectedProfile?: string
  readonly placementSummary?: Record<string, JsonValue>
  readonly managedClaims?: readonly Record<string, JsonValue>[]
}

export interface ProviderVerifyResult {
  readonly providerId: string
  readonly status: 'passed' | 'failed'
  readonly message?: string
  readonly providerIdentity?: {
    readonly id: string
    readonly contractVersion: string
    readonly providerVersion: string
  }
  readonly packageArtifactIdentity?: Record<string, JsonValue>
  readonly selectedProfile?: string
  readonly placementSummary?: Record<string, JsonValue>
  readonly managedClaims?: readonly Record<string, JsonValue>[]
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

export interface ProviderAdoptionSurfaceResult {
  readonly surfaceId: string
  readonly kind: LifecycleSurfaceRecord['kind']
  readonly path: string
  readonly locator: string
  readonly status: 'alreadyApplied' | 'apply' | 'conflict'
  readonly current?: string
  readonly desired: string
  readonly message?: string
}

export interface ProviderAdoptionResult {
  readonly providerId: string
  readonly status: 'ready' | 'adopted' | 'blocked'
  readonly providerIdentity: {
    readonly id: string
    readonly contractVersion: string
    readonly providerVersion: string
  }
  readonly packageArtifactIdentity?: Record<string, JsonValue>
  readonly selectedProfile: string
  readonly placementSummary?: Record<string, JsonValue>
  readonly managedClaims?: readonly Record<string, JsonValue>[]
  readonly surfaces: readonly ProviderAdoptionSurfaceResult[]
}

export interface ProviderLifecycleAdoptOptions extends ProviderLifecycleCommandOptions {
  readonly preludeVersion: string
  readonly dryRun: boolean
}

export interface ProviderLifecycleAdoptResult {
  readonly command: 'adopt'
  readonly status: 'dry-run' | 'completed' | 'blocked'
  readonly providers: readonly ProviderAdoptionResult[]
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
  return encodeJsonString(left) === encodeJsonString(right)
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

function defaultEffectHarnessAdoptionRecord(discovery: EffectHarnessProviderDiscovery): LifecycleProviderRecord {
  return effectHarnessProviderRecordForProjectedContext(discovery, {
    topology: 'single-package',
    packageScopes: ['root'],
    packagePaths: {},
    rootCapabilities: ['ai-harness'],
    packageCapabilities: {
      root: ['effect-package'],
    },
  })
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

function parseLifecycleSurfaceValue(value: string): JsonValue {
  try {
    return decodeJsonString(value) as JsonValue
  }
  catch {
    return value
  }
}

function operationForSurfaceBase(surface: LifecycleSurfaceRecord): ProviderUpdateOperation {
  if (surface.kind === 'structuredPointer') {
    return {
      kind: 'replaceStructuredPointer',
      surfaceId: surface.id,
      path: surface.path,
      pointer: surface.pointer,
      value: parseLifecycleSurfaceValue(surface.base),
    }
  }

  if (surface.kind === 'ownedFile') {
    return {
      kind: 'replaceOwnedFile',
      surfaceId: surface.id,
      path: surface.path,
      content: surface.base ?? '',
    }
  }

  return {
    kind: 'replaceManagedBlock',
    surfaceId: surface.id,
    path: surface.path,
    startMarker: surface.startMarker,
    endMarker: surface.endMarker,
    content: surface.base,
  }
}

function desiredEffectHarnessOperations(record: LifecycleProviderRecord): readonly ProviderUpdateOperation[] {
  return record.surfaces.map(operationForSurfaceBase)
}

function providerLifecycleReadout(record: LifecycleProviderRecord) {
  const packageArtifactIdentity = record.artifact.packageArtifactIdentity

  return {
    providerIdentity: {
      id: record.id,
      contractVersion: record.contractVersion,
      providerVersion: record.providerVersion,
    },
    ...(isJsonObject(packageArtifactIdentity) ? { packageArtifactIdentity } : {}),
    selectedProfile: record.profile,
    ...(record.placementSummary === undefined ? {} : { placementSummary: record.placementSummary }),
    ...(record.managedClaims === undefined ? {} : { managedClaims: record.managedClaims }),
  }
}

function operationDesiredSnapshot(operation: ProviderUpdateOperation) {
  if (operation.kind === 'replaceStructuredPointer') {
    return snapshotOf(operation.value)!
  }

  if (operation.kind === 'replaceOwnedFile') {
    return operation.content
  }

  return operation.content
}

function adoptionConflictMessage(surface: LifecycleSurfaceRecord) {
  return `Lifecycle surface ${surface.id} at ${surface.path} cannot be adopted; existing value differs from provider desired value and has no provider base snapshot`
}

function effectHarnessStatusForDiscovery(discovery: EffectHarnessProviderDiscovery) {
  return Effect.fn('effectHarnessStatus')(
    function* (record: LifecycleProviderRecord): Effect.fn.Return<ProviderStatus, LifecycleCommandError> {
      const issues = effectHarnessRecordProfileIssues(discovery, record)

      return {
        providerId: record.id,
        status: issues.length === 0 ? 'ok' : 'changed',
        ...providerLifecycleReadout(record),
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
            ...providerLifecycleReadout(record),
          }
        : {
            providerId: record.id,
            status: 'failed' as const,
            ...providerLifecycleReadout(record),
            message: `effect-harness lifecycle provider record does not match discovered provider identity: ${issues.join('; ')}`,
          }
    },
  )
}

function planEffectHarnessUpdateForDiscovery(discovery: EffectHarnessProviderDiscovery) {
  return Effect.fn('planEffectHarnessUpdate')(
    function* (record: LifecycleProviderRecord): Effect.fn.Return<ProviderUpdatePlan, LifecycleCommandError> {
      const nextRecord = desiredEffectHarnessRecord(discovery, record)

      return {
        providerId: record.id,
        operations: desiredEffectHarnessOperations(nextRecord),
        nextRecord,
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
      Effect.mapError(error => LifecycleCommandError.make({ message: error.message })),
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

export type ProviderTransitionStep
  = | {
    readonly kind: 'add'
    readonly surfaceId: string
  }
  | {
    readonly kind: 'retire'
    readonly surfaceId: string
  }
  | {
    readonly kind: 'detach'
    readonly surfaceId: string
  }
  | {
    readonly kind: 'ownership-transfer'
    readonly fromSurfaceId: string
    readonly toSurfaceId: string
  }

export type ProviderTransitionStepResult = ProviderTransitionStep & {
  readonly status: 'approved'
}

export interface ProviderLifecycleTransitionOptions extends ProviderLifecycleCommandOptions {
  readonly dryRun: boolean
  readonly transitions: readonly ProviderTransitionStep[]
}

export interface ProviderTransitionResult {
  readonly providerId: string
  readonly status: 'ready' | 'transitioned'
  readonly providerIdentity: {
    readonly id: string
    readonly contractVersion: string
    readonly providerVersion: string
  }
  readonly packageArtifactIdentity?: Record<string, JsonValue>
  readonly selectedProfile: string
  readonly placementSummary?: Record<string, JsonValue>
  readonly managedClaims?: readonly Record<string, JsonValue>[]
  readonly transitions: readonly ProviderTransitionStepResult[]
}

export interface ProviderLifecycleTransitionResult {
  readonly command: 'transition'
  readonly status: 'dry-run' | 'completed'
  readonly providers: readonly ProviderTransitionResult[]
}

export type ManagedSurfaceReconcileResult
  = | { readonly status: 'alreadyApplied' }
    | { readonly status: 'apply' }
    | { readonly status: 'drift' }

const manifestRelativePath = '.prelude/manifest.json'

function manifestPath(targetDir: TargetDir) {
  return pathJoin(targetDir, manifestRelativePath)
}

const readManifest = Effect.fn('readManifest')(
  function* (targetDir: TargetDir): Effect.fn.Return<PreludeManifest, LifecycleCommandError | FileIOError, FsService> {
    const fs = yield* FsService
    const targetPath = manifestPath(targetDir)
    const exists = yield* fs.exists(targetPath)

    if (!exists) {
      return yield* LifecycleCommandError.make({
        message: `No prelude manifest found at ${manifestRelativePath}`,
      })
    }

    const content = yield* fs.readFileString(targetPath)
    const manifest = yield* Effect.try({
      try: () => decodeJsonString(content) as PreludeManifest,
      catch: error => LifecycleCommandError.make({
        message: `Invalid prelude manifest at ${manifestRelativePath}: ${String(error)}`,
      }),
    })

    if (manifest.schemaVersion !== 1) {
      return yield* LifecycleCommandError.make({
        message: `Unsupported prelude manifest schema at ${manifestRelativePath}`,
      })
    }

    if (!Array.isArray(manifest.maintainProviders)) {
      return yield* LifecycleCommandError.make({
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
      try: () => decodeJsonString(content) as LifecycleProviderRecord,
      catch: error => LifecycleCommandError.make({
        message: `Invalid provider record at ${reference.recordPath}: ${String(error)}`,
      }),
    })

    if (record.schemaVersion !== 1 || record.id !== reference.id || record.contractVersion !== reference.contractVersion) {
      return yield* LifecycleCommandError.make({
        message: `Provider record ${reference.recordPath} does not match manifest reference ${reference.id}`,
      })
    }

    if (!Array.isArray(record.surfaces)) {
      return yield* LifecycleCommandError.make({
        message: `Invalid provider surfaces at ${reference.recordPath}`,
      })
    }

    return record
  },
)

function encodeManifest(manifest: PreludeManifest) {
  return `${encodeJsonString(manifest)}\n`
}

function encodeProviderRecord(record: LifecycleProviderRecord) {
  return `${encodeJsonString(record)}\n`
}

function targetPath(targetDir: TargetDir, relativePath: string) {
  return pathJoin(targetDir, relativePath)
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

type DeclaredSurface
  = | {
    readonly status: 'current'
    readonly surface: LifecycleSurfaceRecord
  }
  | {
    readonly status: 'added'
    readonly surface: LifecycleSurfaceRecord
  }

interface SurfaceTransitionAuthorization {
  readonly addedSurfaceIds: ReadonlySet<string>
  readonly addedSurfaceBaseById: ReadonlyMap<string, string>
}

function surfaceById(record: LifecycleProviderRecord, surfaceId: string) {
  return record.surfaces.find(candidate => candidate.id === surfaceId)
}

function findDeclaredSurface(
  record: LifecycleProviderRecord,
  nextRecord: LifecycleProviderRecord | undefined,
  operation: ProviderUpdateOperation,
  authorization?: SurfaceTransitionAuthorization,
): Effect.Effect<DeclaredSurface, LifecycleCommandError> {
  const surface = surfaceById(record, operation.surfaceId)

  if (surface !== undefined && surface.owner === providerOwner(record.id)) {
    return Effect.succeed({ status: 'current', surface })
  }

  const nextSurface = nextRecord === undefined ? undefined : surfaceById(nextRecord, operation.surfaceId)
  if (nextSurface !== undefined && nextSurface.owner === providerOwner(record.id)) {
    if (authorization?.addedSurfaceIds.has(nextSurface.id) === true) {
      return Effect.succeed({ status: 'added', surface: nextSurface })
    }

    return Effect.fail(LifecycleCommandError.make({
      message: `Provider ${record.id} update introduces lifecycle surface ${operation.surfaceId} at ${operation.path}; surface expansion requires an explicit transition`,
    }))
  }

  if (surface === undefined || surface.owner !== providerOwner(record.id)) {
    return Effect.fail(LifecycleCommandError.make({
      message: `Provider ${record.id} update targets undeclared external lifecycle surface ${operation.surfaceId} at ${operation.path}`,
    }))
  }

  return Effect.fail(LifecycleCommandError.make({
    message: `Provider ${record.id} update targets lifecycle surface ${operation.surfaceId} not owned by provider:${record.id}`,
  }))
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
    return Effect.fail(LifecycleCommandError.make({
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
      return yield* LifecycleCommandError.make({
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

  return typeof value === 'string' ? value : encodeJsonString(canonicalJsonValue(value))
}

const readAdoptionCurrentSnapshot = Effect.fn('readAdoptionCurrentSnapshot')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    operation: ProviderUpdateOperation,
  ): Effect.fn.Return<string | undefined, LifecycleCommandError | FileIOError> {
    const pathToRead = targetPath(targetDir, operation.path)
    const exists = yield* fs.exists(pathToRead)
    if (!exists) {
      return undefined
    }

    if (operation.kind === 'replaceOwnedFile') {
      return yield* fs.readFileString(pathToRead)
    }

    if (operation.kind === 'replaceManagedBlock') {
      const currentFile = yield* fs.readFileString(pathToRead)
      const blockCount = managedBlockCount(currentFile, operation)
      if (blockCount > 1) {
        return yield* LifecycleCommandError.make({
          message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} cannot be adopted; managed block markers are duplicated`,
        })
      }

      return extractManagedBlock(currentFile, operation)
    }

    const content = yield* fs.readFileString(pathToRead)
    const json = yield* parseJsonFile(content, operation.path)
    const current = yield* readPointer(json, operation.pointer)
    return snapshotOf(current)
  },
)

const buildAdoptionSurfaceResult = Effect.fn('buildAdoptionSurfaceResult')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    surface: LifecycleSurfaceRecord,
    operation: ProviderUpdateOperation,
  ): Effect.fn.Return<ProviderAdoptionSurfaceResult, LifecycleCommandError | FileIOError> {
    const current = yield* readAdoptionCurrentSnapshot(fs, targetDir, operation)
    const desired = operationDesiredSnapshot(operation)
    const base = {
      surfaceId: surface.id,
      kind: surface.kind,
      path: surface.path,
      locator: surface.locator,
      desired,
      ...(current === undefined ? {} : { current }),
    }

    if (current === undefined) {
      return { ...base, status: 'apply' }
    }

    if (current === desired) {
      return { ...base, status: 'alreadyApplied' }
    }

    return {
      ...base,
      status: 'conflict',
      message: adoptionConflictMessage(surface),
    }
  },
)

const buildProviderAdoptionPlan = Effect.fn('buildProviderAdoptionPlan')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    record: LifecycleProviderRecord,
  ): Effect.fn.Return<{
    readonly operations: readonly ProviderUpdateOperation[]
    readonly surfaces: readonly ProviderAdoptionSurfaceResult[]
  }, LifecycleCommandError | FileIOError> {
    const operations = desiredEffectHarnessOperations(record)
    const surfaces = yield* Effect.forEach(
      operations,
      (operation) => {
        const surface = surfaceById(record, operation.surfaceId)
        if (surface === undefined) {
          return Effect.fail(LifecycleCommandError.make({
            message: `Provider ${record.id} adoption plan targets undeclared lifecycle surface ${operation.surfaceId} at ${operation.path}`,
          }))
        }

        return buildAdoptionSurfaceResult(fs, targetDir, surface, operation)
      },
      { concurrency: 1 },
    )

    return { operations, surfaces }
  },
)

function parseJsonFile(content: string, relativePath: string): Effect.Effect<JsonValue, LifecycleCommandError> {
  try {
    const parsed = decodeJsonString(stripJsonComments(content)) as JsonValue
    return Effect.succeed(parsed)
  }
  catch (error) {
    return Effect.fail(LifecycleCommandError.make({
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
    return Effect.fail(LifecycleCommandError.make({
      message: `Lifecycle surface ${input.surface.id} at ${input.path} drifted; current differs from provider record base and desired value`,
    }))
  }

  return Effect.succeed(decision)
}

function reconcileAddedOrBlock(input: {
  readonly surface: LifecycleSurfaceRecord
  readonly path: string
  readonly current: string | undefined
  readonly desired: string
}) {
  if (input.current === undefined) {
    return Effect.succeed({ status: 'apply' } as const)
  }

  if (input.current === input.desired) {
    return Effect.succeed({ status: 'alreadyApplied' } as const)
  }

  return Effect.fail(LifecycleCommandError.make({
    message: `Lifecycle surface ${input.surface.id} at ${input.path} cannot be adopted; existing value differs from provider desired value and has no provider base snapshot`,
  }))
}

const preflightOperation = Effect.fn('preflightOperation')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    record: LifecycleProviderRecord,
    nextRecord: LifecycleProviderRecord | undefined,
    operation: ProviderUpdateOperation,
    authorization?: SurfaceTransitionAuthorization,
  ): Effect.fn.Return<Exclude<ManagedSurfaceReconcileResult, { readonly status: 'drift' }>, LifecycleCommandError | FileIOError> {
    const declared = yield* findDeclaredSurface(record, nextRecord, operation, authorization)
    const { surface } = declared

    if (operation.kind === 'replaceOwnedFile') {
      if (surface.kind !== 'ownedFile' || surface.authority !== 'owner' || surface.path !== operation.path) {
        return yield* LifecycleCommandError.make({
          message: `Provider ${record.id} update operation does not match declared owned lifecycle surface ${operation.surfaceId}`,
        })
      }

      if (declared.status === 'added') {
        const pathToRead = targetPath(targetDir, operation.path)
        const exists = yield* fs.exists(pathToRead)
        const current = exists ? yield* fs.readFileString(pathToRead) : undefined
        const transferredBase = authorization?.addedSurfaceBaseById.get(surface.id)
        if (transferredBase !== undefined) {
          if (current === undefined) {
            return yield* LifecycleCommandError.make({
              message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} drifted; current logical value is missing`,
            })
          }

          return yield* reconcileOrBlock({
            surface,
            path: operation.path,
            base: transferredBase,
            current,
            desired: operation.content,
          })
        }

        return yield* reconcileAddedOrBlock({
          surface,
          path: operation.path,
          current,
          desired: operation.content,
        })
      }

      const base = surfaceBase(surface)
      if (base === undefined) {
        return yield* LifecycleCommandError.make({
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
        return yield* LifecycleCommandError.make({
          message: `Provider ${record.id} update operation does not match declared managed block lifecycle surface ${operation.surfaceId}`,
        })
      }

      if (declared.status === 'added') {
        const pathToRead = targetPath(targetDir, operation.path)
        const exists = yield* fs.exists(pathToRead)
        if (!exists) {
          return { status: 'apply' }
        }

        const currentFile = yield* fs.readFileString(pathToRead)
        const blockCount = managedBlockCount(currentFile, operation)
        if (blockCount > 1) {
          return yield* LifecycleCommandError.make({
            message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} drifted; managed block markers are duplicated`,
          })
        }

        const current = extractManagedBlock(currentFile, operation)
        const transferredBase = authorization?.addedSurfaceBaseById.get(surface.id)
        if (transferredBase !== undefined) {
          if (current === undefined) {
            return yield* LifecycleCommandError.make({
              message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} drifted; managed block markers are missing`,
            })
          }

          return yield* reconcileOrBlock({
            surface,
            path: operation.path,
            base: transferredBase,
            current,
            desired: operation.content,
          })
        }

        return yield* reconcileAddedOrBlock({
          surface,
          path: operation.path,
          current,
          desired: operation.content,
        })
      }

      const base = surfaceBase(surface)
      if (base === undefined) {
        return yield* LifecycleCommandError.make({
          message: `Provider ${record.id} managed block lifecycle surface ${operation.surfaceId} has no base snapshot`,
        })
      }

      const currentFile = yield* fs.readFileString(targetPath(targetDir, operation.path))
      const blockCount = managedBlockCount(currentFile, operation)
      if (blockCount > 1) {
        return yield* LifecycleCommandError.make({
          message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} drifted; managed block markers are duplicated`,
        })
      }

      const current = extractManagedBlock(currentFile, operation)
      if (current === undefined) {
        return yield* LifecycleCommandError.make({
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
      return yield* LifecycleCommandError.make({
        message: `Provider ${record.id} update operation does not match declared structured lifecycle surface ${operation.surfaceId}`,
      })
    }

    if (declared.status === 'added') {
      const pathToRead = targetPath(targetDir, operation.path)
      const exists = yield* fs.exists(pathToRead)
      let currentSnapshot: string | undefined
      if (exists) {
        const content = yield* fs.readFileString(pathToRead)
        const json = yield* parseJsonFile(content, operation.path)
        const current = yield* readPointer(json, operation.pointer)
        currentSnapshot = snapshotOf(current)
      }
      const desiredSnapshot = snapshotOf(operation.value)

      if (desiredSnapshot === undefined) {
        return yield* LifecycleCommandError.make({
          message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} cannot be reconciled because the desired logical value is missing`,
        })
      }

      const transferredBase = authorization?.addedSurfaceBaseById.get(surface.id)
      if (transferredBase !== undefined) {
        if (currentSnapshot === undefined) {
          return yield* LifecycleCommandError.make({
            message: `Lifecycle surface ${operation.surfaceId} at ${operation.path} drifted; current logical value is missing`,
          })
        }

        return yield* reconcileOrBlock({
          surface,
          path: operation.path,
          base: transferredBase,
          current: currentSnapshot,
          desired: desiredSnapshot,
        })
      }

      return yield* reconcileAddedOrBlock({
        surface,
        path: operation.path,
        current: currentSnapshot,
        desired: desiredSnapshot,
      })
    }

    const content = yield* fs.readFileString(targetPath(targetDir, operation.path))
    const json = yield* parseJsonFile(content, operation.path)
    const current = yield* readPointer(json, operation.pointer)
    const currentSnapshot = snapshotOf(current)
    const desiredSnapshot = snapshotOf(operation.value)

    const base = surfaceBase(surface)

    if (base === undefined || currentSnapshot === undefined || desiredSnapshot === undefined) {
      return yield* LifecycleCommandError.make({
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
      yield* fs.ensureDir(pathDirname(pathToWrite))
      yield* fs.writeFileString(pathToWrite, operation.content)
      return
    }

    if (operation.kind === 'replaceManagedBlock') {
      const pathToWrite = targetPath(targetDir, operation.path)
      const exists = yield* fs.exists(pathToWrite)
      const current = exists ? yield* fs.readFileString(pathToWrite) : ''
      yield* fs.ensureDir(pathDirname(pathToWrite))
      yield* fs.writeFileString(pathToWrite, upsertManagedBlock(current, operation, operation.content))
      return
    }

    const pathToWrite = targetPath(targetDir, operation.path)
    const exists = yield* fs.exists(pathToWrite)
    const json = exists
      ? yield* parseJsonFile(yield* fs.readFileString(pathToWrite), operation.path)
      : {}
    const nextJson = yield* writePointer(json, operation.pointer, operation.value)

    if (!isJsonObject(nextJson)) {
      return yield* LifecycleCommandError.make({
        message: `Structured lifecycle surface ${operation.path} must remain a JSON object`,
      })
    }

    yield* fs.ensureDir(pathDirname(pathToWrite))
    yield* fs.writeFileString(pathToWrite, `${encodeJsonString(nextJson)}\n`)
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
  const providers = [...manifest.maintainProviders]

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
    ...manifest,
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
      return Effect.fail(LifecycleCommandError.make({
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
    return Effect.fail(LifecycleCommandError.make({
      message: `No lifecycle provider adapter registered for ${record.id}`,
    }))
  }

  if (provider.contractVersion !== 'discovered' && provider.contractVersion !== record.contractVersion) {
    return Effect.fail(LifecycleCommandError.make({
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
    return Effect.fail(LifecycleCommandError.make({
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
    return Effect.fail(LifecycleCommandError.make({
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

function surfaceTransitionIdentity(surface: LifecycleSurfaceRecord) {
  const identity: Record<string, unknown> = {
    owner: surface.owner,
    kind: surface.kind,
    authority: surface.authority,
    scope: surface.scope,
    locator: surface.locator,
    path: surface.path,
  }

  if (surface.kind === 'structuredPointer') {
    identity.pointer = surface.pointer
  }

  if (surface.kind === 'managedBlock') {
    identity.startMarker = surface.startMarker
    identity.endMarker = surface.endMarker
  }

  return identity
}

function surfaceTransferIdentity(surface: LifecycleSurfaceRecord) {
  const identity = surfaceTransitionIdentity(surface)
  delete identity.owner
  return identity
}

function surfaceTransitionDiff(record: LifecycleProviderRecord, nextRecord: LifecycleProviderRecord) {
  const currentById = new Map(record.surfaces.map(surface => [surface.id, surface]))
  const nextById = new Map(nextRecord.surfaces.map(surface => [surface.id, surface]))
  const added = nextRecord.surfaces.filter(surface => !currentById.has(surface.id))
  const removed = record.surfaces.filter(surface => !nextById.has(surface.id))
  const changed = nextRecord.surfaces.flatMap((nextSurface) => {
    const currentSurface = currentById.get(nextSurface.id)
    if (currentSurface === undefined) {
      return []
    }

    return jsonMatches(surfaceTransitionIdentity(currentSurface), surfaceTransitionIdentity(nextSurface))
      ? []
      : [{ current: currentSurface, next: nextSurface }]
  })

  return { added, removed, changed }
}

function firstSurfaceTransitionId(diff: ReturnType<typeof surfaceTransitionDiff>) {
  return diff.added[0]?.id ?? diff.removed[0]?.id ?? diff.changed[0]?.next.id
}

function assertNoImplicitSurfaceTransitions(
  record: LifecycleProviderRecord,
  plan: ProviderUpdatePlan,
): Effect.Effect<void, LifecycleCommandError> {
  if (plan.nextRecord === undefined) {
    return Effect.void
  }

  const diff = surfaceTransitionDiff(record, plan.nextRecord)
  const surfaceId = firstSurfaceTransitionId(diff)
  if (surfaceId !== undefined) {
    return Effect.fail(LifecycleCommandError.make({
      message: `Provider ${record.id} update changes lifecycle surface ${surfaceId}; surface transition requires an explicit transition`,
    }))
  }

  return Effect.void
}

function requireSurfaceBase(record: LifecycleProviderRecord, surface: LifecycleSurfaceRecord, action: string): Effect.Effect<string, LifecycleCommandError> {
  const base = surfaceBase(surface)
  if (base === undefined) {
    return Effect.fail(LifecycleCommandError.make({
      message: `Provider ${record.id} transition ${action} for lifecycle surface ${surface.id} requires a provider record base snapshot`,
    }))
  }

  return Effect.succeed(base)
}

const preflightSurfaceRemoval = Effect.fn('preflightSurfaceRemoval')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    record: LifecycleProviderRecord,
    surface: LifecycleSurfaceRecord,
    action: string,
  ): Effect.fn.Return<void, LifecycleCommandError | FileIOError> {
    const base = yield* requireSurfaceBase(record, surface, action)
    const operation = operationForSurfaceBase(surface)
    const current = yield* readAdoptionCurrentSnapshot(fs, targetDir, operation)

    if (current === undefined) {
      return yield* LifecycleCommandError.make({
        message: `Lifecycle surface ${surface.id} at ${surface.path} drifted; current logical value is missing`,
      })
    }

    yield* reconcileOrBlock({
      surface,
      path: surface.path,
      base,
      current,
      desired: base,
    })
  },
)

interface ValidatedSurfaceTransition {
  readonly authorization: SurfaceTransitionAuthorization
  readonly removals: readonly {
    readonly action: ProviderTransitionStep['kind']
    readonly surface: LifecycleSurfaceRecord
  }[]
  readonly approved: readonly ProviderTransitionStepResult[]
}

function duplicateTransitionMessage(record: LifecycleProviderRecord, key: string) {
  return `Provider ${record.id} transition declares duplicate lifecycle surface transition ${key}`
}

function validateSurfaceTransitionSteps(
  record: LifecycleProviderRecord,
  plan: ProviderUpdatePlan,
  transitions: readonly ProviderTransitionStep[],
): Effect.Effect<ValidatedSurfaceTransition, LifecycleCommandError> {
  const nextRecord = plan.nextRecord ?? record
  const currentById = new Map(record.surfaces.map(surface => [surface.id, surface]))
  const nextById = new Map(nextRecord.surfaces.map(surface => [surface.id, surface]))
  const diff = surfaceTransitionDiff(record, nextRecord)
  const addedSurfaceIds = new Set<string>()
  const removedSurfaceIds = new Set<string>()
  const changedSurfaceIds = new Set<string>()
  const addedSurfaceBaseById = new Map<string, string>()
  const removals: Array<{ action: ProviderTransitionStep['kind'], surface: LifecycleSurfaceRecord }> = []
  const seen = new Set<string>()

  for (const transition of transitions) {
    const key = transition.kind === 'ownership-transfer'
      ? `${transition.kind}:${transition.fromSurfaceId}->${transition.toSurfaceId}`
      : `${transition.kind}:${transition.surfaceId}`

    if (seen.has(key)) {
      return Effect.fail(LifecycleCommandError.make({
        message: duplicateTransitionMessage(record, key),
      }))
    }
    seen.add(key)

    if (transition.kind === 'add') {
      const current = currentById.get(transition.surfaceId)
      const next = nextById.get(transition.surfaceId)
      if (current !== undefined || next === undefined) {
        return Effect.fail(LifecycleCommandError.make({
          message: `Provider ${record.id} transition add requires a newly declared lifecycle surface ${transition.surfaceId}`,
        }))
      }

      if (next.owner !== providerOwner(record.id)) {
        return Effect.fail(LifecycleCommandError.make({
          message: `Provider ${record.id} transition add for lifecycle surface ${transition.surfaceId} does not transfer ownership to provider:${record.id}`,
        }))
      }

      addedSurfaceIds.add(transition.surfaceId)
      continue
    }

    if (transition.kind === 'retire' || transition.kind === 'detach') {
      const current = currentById.get(transition.surfaceId)
      const next = nextById.get(transition.surfaceId)
      if (current === undefined || next !== undefined) {
        return Effect.fail(LifecycleCommandError.make({
          message: `Provider ${record.id} transition ${transition.kind} requires an existing lifecycle surface removed from the next provider record: ${transition.surfaceId}`,
        }))
      }

      removedSurfaceIds.add(transition.surfaceId)
      removals.push({ action: transition.kind, surface: current })
      continue
    }

    const current = currentById.get(transition.fromSurfaceId)
    const next = nextById.get(transition.toSurfaceId)
    if (current === undefined || next === undefined) {
      return Effect.fail(LifecycleCommandError.make({
        message: `Provider ${record.id} ownership-transfer requires existing surface ${transition.fromSurfaceId} and next surface ${transition.toSurfaceId}`,
      }))
    }

    if (!jsonMatches(surfaceTransferIdentity(current), surfaceTransferIdentity(next))) {
      return Effect.fail(LifecycleCommandError.make({
        message: `Provider ${record.id} ownership-transfer identity mapping ${transition.fromSurfaceId} -> ${transition.toSurfaceId} is invalid for lifecycle surface ${transition.toSurfaceId}`,
      }))
    }

    if (next.owner !== providerOwner(record.id)) {
      return Effect.fail(LifecycleCommandError.make({
        message: `Provider ${record.id} ownership-transfer for lifecycle surface ${transition.toSurfaceId} does not transfer ownership to provider:${record.id}`,
      }))
    }

    const base = surfaceBase(current)
    if (base === undefined) {
      return Effect.fail(LifecycleCommandError.make({
        message: `Provider ${record.id} ownership-transfer ${transition.fromSurfaceId} -> ${transition.toSurfaceId} requires a provider record base snapshot`,
      }))
    }

    if (transition.fromSurfaceId === transition.toSurfaceId) {
      changedSurfaceIds.add(transition.fromSurfaceId)
    }
    else {
      removedSurfaceIds.add(transition.fromSurfaceId)
      addedSurfaceIds.add(transition.toSurfaceId)
      removals.push({ action: transition.kind, surface: current })
    }
    addedSurfaceBaseById.set(transition.toSurfaceId, base)
  }

  for (const surface of diff.added) {
    if (!addedSurfaceIds.has(surface.id)) {
      return Effect.fail(LifecycleCommandError.make({
        message: `Provider ${record.id} transition plan adds lifecycle surface ${surface.id}; add requires an explicit transition`,
      }))
    }
  }

  for (const surface of diff.removed) {
    if (!removedSurfaceIds.has(surface.id)) {
      return Effect.fail(LifecycleCommandError.make({
        message: `Provider ${record.id} transition plan removes lifecycle surface ${surface.id}; retire or detach requires an explicit transition`,
      }))
    }
  }

  for (const change of diff.changed) {
    if (!changedSurfaceIds.has(change.next.id)) {
      return Effect.fail(LifecycleCommandError.make({
        message: `Provider ${record.id} transition plan changes lifecycle surface ${change.next.id}; ownership-transfer requires an explicit transition`,
      }))
    }
  }

  const operationSurfaceIds = new Set(plan.operations.map(operation => operation.surfaceId))
  for (const surfaceId of addedSurfaceIds) {
    if (!operationSurfaceIds.has(surfaceId)) {
      return Effect.fail(LifecycleCommandError.make({
        message: `Provider ${record.id} transition adds lifecycle surface ${surfaceId} but the provider plan omits its maintain WritePlan operation`,
      }))
    }
  }

  for (const surfaceId of removedSurfaceIds) {
    if (operationSurfaceIds.has(surfaceId)) {
      return Effect.fail(LifecycleCommandError.make({
        message: `Provider ${record.id} transition removes lifecycle surface ${surfaceId} but the provider plan still targets it`,
      }))
    }
  }

  return Effect.succeed({
    authorization: {
      addedSurfaceIds,
      addedSurfaceBaseById,
    },
    removals,
    approved: transitions.map(transition => ({ ...transition, status: 'approved' as const })),
  })
}

function providerTransitionResult(
  record: LifecycleProviderRecord,
  status: ProviderTransitionResult['status'],
  transitions: readonly ProviderTransitionStepResult[],
): ProviderTransitionResult {
  return {
    providerId: record.id,
    status,
    ...providerLifecycleReadout(record),
    transitions,
  }
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
        preflightOperation(fs, targetDir, record, plan.nextRecord, operation).pipe(
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

function providerAdoptionResult(
  record: LifecycleProviderRecord,
  status: ProviderAdoptionResult['status'],
  surfaces: readonly ProviderAdoptionSurfaceResult[],
): ProviderAdoptionResult {
  return {
    providerId: record.id,
    status,
    ...providerLifecycleReadout(record),
    surfaces,
  }
}

function firstAdoptionConflict(surfaces: readonly ProviderAdoptionSurfaceResult[]) {
  return surfaces.find(surface => surface.status === 'conflict')
}

function ensureEffectHarnessAdoptionProvider(provider: string | undefined): Effect.Effect<void, LifecycleCommandError> {
  if (provider !== 'effect-harness') {
    return Effect.fail(LifecycleCommandError.make({
      message: provider === undefined
        ? 'Provider adoption requires --provider effect-harness'
        : `Provider adoption is not supported for ${provider}`,
    }))
  }

  return Effect.void
}

function adoptionManifest(preludeVersion: string, record: LifecycleProviderRecord): PreludeManifest {
  return {
    schemaVersion: 1,
    preludeVersion,
    maintainProviders: [effectHarnessMaintainProviderReference(record)],
    verificationRecords: [effectHarnessVerificationRecord()],
  }
}

export const runProviderLifecycleAdopt = Effect.fn('runProviderLifecycleAdopt')(
  function* (options: ProviderLifecycleAdoptOptions): Effect.fn.Return<ProviderLifecycleAdoptResult, LifecycleCommandError | FileIOError, FsService | EffectHarnessProviderDiscoveryService> {
    yield* ensureEffectHarnessAdoptionProvider(options.provider)
    const fs = yield* FsService
    const manifestExists = yield* fs.exists(manifestPath(options.targetDir))
    if (manifestExists) {
      return yield* LifecycleCommandError.make({
        message: `Cannot adopt provider effect-harness because ${manifestRelativePath} already exists`,
      })
    }

    const discoveryService = yield* EffectHarnessProviderDiscoveryService
    const discovery = yield* discoveryService.discover.pipe(
      Effect.mapError(error => LifecycleCommandError.make({ message: error.message })),
    )
    const record = defaultEffectHarnessAdoptionRecord(discovery)
    const provider = yield* providerFor(options.providers, record)
    const plan = yield* buildProviderAdoptionPlan(fs, options.targetDir, record)
    const conflict = firstAdoptionConflict(plan.surfaces)
    const blockedProvider = providerAdoptionResult(record, 'blocked', plan.surfaces)

    if (options.dryRun) {
      return {
        command: 'adopt',
        status: conflict === undefined ? 'dry-run' : 'blocked',
        providers: [conflict === undefined ? providerAdoptionResult(record, 'ready', plan.surfaces) : blockedProvider],
      }
    }

    if (conflict !== undefined) {
      return yield* LifecycleCommandError.make({
        message: conflict.message ?? adoptionConflictMessage(surfaceById(record, conflict.surfaceId)!),
      })
    }

    yield* Effect.forEach(
      plan.operations.filter((operation) => {
        const surface = plan.surfaces.find(candidate => candidate.surfaceId === operation.surfaceId)
        return surface?.status === 'apply'
      }),
      operation => applyOperation(fs, options.targetDir, operation),
      { concurrency: 1, discard: true },
    )

    const verification = yield* verifyProviderCurrentState(fs, options.targetDir, record, provider)
    yield* assertProviderVerifyPassed(record, verification)

    const recordPath = targetPath(options.targetDir, effectHarnessMaintainProviderReference(record).recordPath)
    yield* fs.ensureDir(pathDirname(recordPath))
    yield* fs.writeFileString(recordPath, encodeProviderRecord(record))
    const manifestTargetPath = manifestPath(options.targetDir)
    yield* fs.ensureDir(pathDirname(manifestTargetPath))
    yield* fs.writeFileString(manifestTargetPath, encodeManifest(adoptionManifest(options.preludeVersion, record)))

    return {
      command: 'adopt',
      status: 'completed',
      providers: [providerAdoptionResult(record, 'adopted', plan.surfaces)],
    }
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

export const runProviderLifecycleTransition = Effect.fn('runProviderLifecycleTransition')(
  function* (options: ProviderLifecycleTransitionOptions): Effect.fn.Return<ProviderLifecycleTransitionResult, LifecycleCommandError | FileIOError, FsService | EffectHarnessProviderDiscoveryService> {
    const fs = yield* FsService
    const manifest = yield* readManifest(options.targetDir)
    const references = yield* selectProviderReferences(manifest, options.provider)

    if (references.length === 0) {
      return {
        command: 'transition',
        status: options.dryRun ? 'dry-run' : 'completed',
        providers: [],
      }
    }

    const plannedTransitions = yield* Effect.forEach(references, reference =>
      Effect.gen(function* () {
        const record = yield* readProviderRecord(fs, options.targetDir, reference)
        const provider = yield* providerFor(options.providers, record)
        yield* provider.status(record)
        const plan = yield* provider.planUpdate(record, { providerId: record.id })
        yield* assertPlanCoversRetainedSurfaces(record, plan)
        const transition = yield* validateSurfaceTransitionSteps(record, plan, options.transitions)
        return { provider, reference, record, plan, transition }
      }), { concurrency: 1 })

    const preflightedTransitions = yield* Effect.forEach(
      plannedTransitions,
      update =>
        Effect.gen(function* () {
          yield* Effect.forEach(
            update.transition.removals,
            removal => preflightSurfaceRemoval(fs, options.targetDir, update.record, removal.surface, removal.action),
            { concurrency: 1, discard: true },
          )

          const operations = yield* Effect.forEach(
            update.plan.operations,
            operation =>
              preflightOperation(
                fs,
                options.targetDir,
                update.record,
                update.plan.nextRecord,
                operation,
                update.transition.authorization,
              ).pipe(Effect.map(decision => ({ decision, operation }))),
            { concurrency: 1 },
          )

          return {
            ...update,
            operations,
          }
        }),
      { concurrency: 1 },
    )

    if (options.dryRun) {
      return {
        command: 'transition',
        status: 'dry-run',
        providers: plannedTransitions.map(update =>
          providerTransitionResult(
            nextRecordForPlan(update.record, update.plan),
            'ready',
            update.transition.approved,
          )),
      }
    }

    yield* Effect.forEach(
      preflightedTransitions,
      update =>
        Effect.forEach(
          update.operations.filter(operation => operation.decision.status === 'apply'),
          operation => applyOperation(fs, options.targetDir, operation.operation),
          { concurrency: 1, discard: true },
        ),
      { concurrency: 1, discard: true },
    )

    const providers = yield* Effect.forEach(plannedTransitions, (update) => {
      const nextRecord = nextRecordForPlan(update.record, update.plan)
      return update.provider.verify(nextRecord)
    }, { concurrency: 1 })

    for (let index = 0; index < plannedTransitions.length; index += 1) {
      yield* assertProviderVerifyPassed(plannedTransitions[index]!.record, providers[index]!)
    }

    yield* Effect.forEach(plannedTransitions, (update) => {
      const nextRecord = nextRecordForPlan(update.record, update.plan)
      const pathToRecord = targetPath(options.targetDir, update.reference.recordPath)
      return Effect.gen(function* () {
        yield* fs.ensureDir(pathDirname(pathToRecord))
        yield* fs.writeFileString(pathToRecord, encodeProviderRecord(nextRecord))
      })
    }, { concurrency: 1, discard: true })

    const nextManifest = applyManifestUpdates(manifest, plannedTransitions)
    const pathToManifest = manifestPath(options.targetDir)
    yield* fs.ensureDir(pathDirname(pathToManifest))
    yield* fs.writeFileString(pathToManifest, encodeManifest(nextManifest))

    return {
      command: 'transition',
      status: 'completed',
      providers: plannedTransitions.map(update =>
        providerTransitionResult(
          nextRecordForPlan(update.record, update.plan),
          'transitioned',
          update.transition.approved,
        )),
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
        yield* assertNoImplicitSurfaceTransitions(record, plan)
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
              preflightOperation(fs, options.targetDir, update.record, update.plan.nextRecord, operation).pipe(
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
        yield* fs.ensureDir(pathDirname(pathToRecord))
        yield* fs.writeFileString(pathToRecord, encodeProviderRecord(nextRecord))
      })
    }, { concurrency: 1, discard: true })

    const pathToManifest = manifestPath(options.targetDir)
    yield* fs.ensureDir(pathDirname(pathToManifest))
    yield* fs.writeFileString(pathToManifest, encodeManifest(nextManifest))

    return {
      command: 'update',
      status: 'completed',
      providers,
    }
  },
)
