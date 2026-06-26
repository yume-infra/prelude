import type { TargetDir } from '@/brand/target-dir'
import type { CreateFs, JsonValue, LifecycleProviderRecord, LifecycleSurfaceRecord, PreludeManifest } from '@/core/create'
import type { FileIOError } from '@/core/errors'
import * as path from 'node:path'
import { Effect, Schema } from 'effect'
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
    readonly kind: 'replaceProviderFile'
    readonly path: string
    readonly content: string
  }
  | {
    readonly kind: 'replaceOwnedFile'
    readonly surfaceId: string
    readonly path: string
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
  readonly status: (record: LifecycleProviderRecord) => Effect.Effect<ProviderStatus, LifecycleCommandError>
  readonly verify: (record: LifecycleProviderRecord) => Effect.Effect<ProviderVerifyResult, LifecycleCommandError>
  readonly planUpdate: (
    record: LifecycleProviderRecord,
    options: ProviderUpdateOptions,
  ) => Effect.Effect<ProviderUpdatePlan, LifecycleCommandError>
}

export type LifecycleProviderRegistry = Record<string, LifecycleProvider>

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

    if (!Array.isArray(manifest.lifecycleProviders) || !Array.isArray(manifest.lifecycleSurfaces)) {
      return yield* new LifecycleCommandError({
        message: `Invalid prelude manifest lifecycle records at ${manifestRelativePath}`,
      })
    }

    return manifest
  },
)

function encodeManifest(manifest: PreludeManifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

function targetPath(targetDir: TargetDir, relativePath: string) {
  return path.join(targetDir, relativePath)
}

function normalizeRelativePath(relativePath: string) {
  return path.posix.normalize(relativePath.replaceAll('\\', '/'))
}

function isProviderNamespacePath(providerId: string, relativePath: string) {
  if (path.isAbsolute(relativePath)) {
    return false
  }

  const normalizedPath = normalizeRelativePath(relativePath)
  const providerPrefix = `.prelude/providers/${providerId}/`

  return !normalizedPath.startsWith('../') && normalizedPath.startsWith(providerPrefix)
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
  manifest: PreludeManifest,
  record: LifecycleProviderRecord,
  operation: Exclude<ProviderUpdateOperation, { readonly kind: 'replaceProviderFile' }>,
): Effect.Effect<LifecycleSurfaceRecord, LifecycleCommandError> {
  const surface = manifest.lifecycleSurfaces.find(candidate => candidate.id === operation.surfaceId)

  if (surface === undefined || !record.lifecycleSurfaces.includes(operation.surfaceId) || surface.owner !== providerOwner(record.id)) {
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

function snapshotOf(value: JsonValue | undefined) {
  if (value === undefined) {
    return undefined
  }

  return typeof value === 'string' ? value : JSON.stringify(value)
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
      message: `Lifecycle surface ${input.surface.id} at ${input.path} drifted; current differs from manifest base and desired value`,
    }))
  }

  return Effect.succeed(decision)
}

function findProviderNamespaceSurface(
  manifest: PreludeManifest,
  record: LifecycleProviderRecord,
  relativePath: string,
) {
  return manifest.lifecycleSurfaces.find(surface =>
    surface.kind === 'ownedFile'
    && surface.path === relativePath
    && surface.owner === providerOwner(record.id)
    && record.lifecycleSurfaces.includes(surface.id),
  )
}

const preflightOperation = Effect.fn('preflightOperation')(
  function* (
    fs: CreateFs,
    targetDir: TargetDir,
    manifest: PreludeManifest,
    record: LifecycleProviderRecord,
    operation: ProviderUpdateOperation,
  ): Effect.fn.Return<Exclude<ManagedSurfaceReconcileResult, { readonly status: 'drift' }>, LifecycleCommandError | FileIOError> {
    if (operation.kind === 'replaceProviderFile') {
      if (!isProviderNamespacePath(record.id, operation.path)) {
        return yield* new LifecycleCommandError({
          message: `Provider ${record.id} update targets unsupported provider path ${operation.path}; provider writes must stay under .prelude/providers/${record.id}/`,
        })
      }

      const surface = findProviderNamespaceSurface(manifest, record, operation.path)
      if (surface === undefined) {
        return { status: 'apply' as const }
      }

      const base = surfaceBase(surface)
      if (base === undefined) {
        return yield* new LifecycleCommandError({
          message: `Provider ${record.id} provider lifecycle surface ${surface.id} has no base snapshot`,
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

    const surface = yield* findDeclaredSurface(manifest, record, operation)

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
    if (operation.kind === 'replaceProviderFile' || operation.kind === 'replaceOwnedFile') {
      const pathToWrite = targetPath(targetDir, operation.path)
      yield* fs.ensureDir(path.dirname(pathToWrite))
      yield* fs.writeFileString(pathToWrite, operation.content)
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
    readonly record: LifecycleProviderRecord
    readonly plan: ProviderUpdatePlan
  }[],
) {
  const nextManifest = JSON.parse(JSON.stringify(manifest)) as PreludeManifest
  const providers = [...nextManifest.lifecycleProviders]
  const surfaces = [...nextManifest.lifecycleSurfaces]

  for (const update of plannedUpdates) {
    if (update.plan.nextRecord !== undefined) {
      const providerIndex = providers.findIndex(record => record.id === update.record.id)
      if (providerIndex >= 0) {
        providers[providerIndex] = update.plan.nextRecord
      }
    }

    for (const operation of update.plan.operations) {
      if (operation.kind === 'replaceOwnedFile') {
        const surfaceIndex = surfaces.findIndex(surface => surface.id === operation.surfaceId)
        if (surfaceIndex >= 0 && surfaces[surfaceIndex]!.kind === 'ownedFile') {
          surfaces[surfaceIndex] = {
            ...surfaces[surfaceIndex]!,
            base: operation.content,
            snapshot: operation.content,
          }
        }
      }

      if (operation.kind === 'replaceStructuredPointer') {
        const surfaceIndex = surfaces.findIndex(surface => surface.id === operation.surfaceId)
        if (surfaceIndex >= 0 && surfaces[surfaceIndex]!.kind === 'structuredPointer') {
          const snapshot = snapshotOf(operation.value)!
          surfaces[surfaceIndex] = {
            ...surfaces[surfaceIndex]!,
            base: snapshot,
            snapshot,
          }
        }
      }

      if (operation.kind === 'replaceProviderFile') {
        const surfaceIndex = surfaces.findIndex(surface =>
          surface.kind === 'ownedFile'
          && surface.owner === providerOwner(update.record.id)
          && surface.path === operation.path
          && update.record.lifecycleSurfaces.includes(surface.id),
        )
        if (surfaceIndex >= 0) {
          surfaces[surfaceIndex] = {
            ...surfaces[surfaceIndex]!,
            base: operation.content,
            snapshot: operation.content,
          }
        }
      }
    }
  }

  return {
    ...nextManifest,
    lifecycleProviders: providers,
    lifecycleSurfaces: surfaces,
  }
}

function selectProviderRecords(
  manifest: PreludeManifest,
  providerId: string | undefined,
): Effect.Effect<readonly LifecycleProviderRecord[], LifecycleCommandError> {
  const records = manifest.lifecycleProviders

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

  if (provider.contractVersion !== record.contractVersion) {
    return Effect.fail(new LifecycleCommandError({
      message: `Lifecycle provider ${record.id} contract transition ${record.contractVersion} -> ${provider.contractVersion} is unsupported; no declarative migration plan is registered`,
    }))
  }

  return Effect.succeed(provider)
}

export const runProviderLifecycleStatus = Effect.fn('runProviderLifecycleStatus')(
  function* (options: ProviderLifecycleCommandOptions): Effect.fn.Return<ProviderLifecycleStatusResult, LifecycleCommandError | FileIOError, FsService> {
    const manifest = yield* readManifest(options.targetDir)
    const records = yield* selectProviderRecords(manifest, options.provider)

    if (records.length === 0) {
      return {
        command: 'status',
        status: 'noop',
        providers: [],
      }
    }

    const providers = yield* Effect.forEach(records, record =>
      Effect.gen(function* () {
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
  function* (options: ProviderLifecycleCommandOptions): Effect.fn.Return<ProviderLifecycleVerifyResult, LifecycleCommandError | FileIOError, FsService> {
    const manifest = yield* readManifest(options.targetDir)
    const records = yield* selectProviderRecords(manifest, options.provider)

    if (records.length === 0) {
      return {
        command: 'verify',
        status: 'noop',
        providers: [],
      }
    }

    const providers = yield* Effect.forEach(records, record =>
      Effect.gen(function* () {
        const provider = yield* providerFor(options.providers, record)
        return yield* provider.verify(record)
      }))

    return {
      command: 'verify',
      status: 'completed',
      providers,
    }
  },
)

export const runProviderLifecycleUpdate = Effect.fn('runProviderLifecycleUpdate')(
  function* (options: ProviderLifecycleCommandOptions): Effect.fn.Return<ProviderLifecycleUpdateResult, LifecycleCommandError | FileIOError, FsService> {
    const fs = yield* FsService
    const manifest = yield* readManifest(options.targetDir)
    const records = yield* selectProviderRecords(manifest, options.provider)

    if (records.length === 0) {
      return {
        command: 'update',
        status: 'noop',
        providers: [],
      }
    }

    const plannedUpdates = yield* Effect.forEach(records, record =>
      Effect.gen(function* () {
        const provider = yield* providerFor(options.providers, record)
        yield* provider.status(record)
        const plan = yield* provider.planUpdate(record, { providerId: record.id })
        return { provider, record, plan }
      }), { concurrency: 1 })

    const preflightedUpdates = yield* Effect.forEach(
      plannedUpdates,
      update =>
        Effect.gen(function* () {
          const operations = yield* Effect.forEach(
            update.plan.operations,
            operation =>
              preflightOperation(fs, options.targetDir, manifest, update.record, operation).pipe(
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
      const nextRecord = update.plan.nextRecord ?? update.record
      return update.provider.verify(nextRecord)
    }, { concurrency: 1 })

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
