import type { PreludeError } from './errors.js'

import { randomBytes } from 'node:crypto'
import { hostname } from 'node:os'
import process from 'node:process'

import { Effect, FileSystem, Path, Result, Schema } from 'effect'

import { errorMessage, preludeError } from './errors.js'
import { decodeJson, encodeJson } from './json.js'

const WRITE_BOUNDARY_SCHEMA_VERSION = 1
const PROCESS_STARTED_AT_EPOCH_MS = Math.round(performance.timeOrigin)
const NONCE_PATTERN = /^[a-f0-9]{32}$/u

const WriteBoundaryOwnerSchema = Schema.Struct({
  schemaVersion: Schema.Literal(WRITE_BOUNDARY_SCHEMA_VERSION),
  controlRoot: Schema.String,
  hostname: Schema.String,
  pid: Schema.Int,
  processStartedAtEpochMs: Schema.Finite,
  acquiredAtEpochMs: Schema.Finite,
  nonce: Schema.String,
})

type WriteBoundaryOwner = Schema.Schema.Type<typeof WriteBoundaryOwnerSchema>

export type TargetWriteBoundaryDiagnosis
  = | { readonly status: 'available', readonly lockPath: string }
    | { readonly status: 'held', readonly lockPath: string, readonly owner: WriteBoundaryOwner, readonly recovery: string }
    | { readonly status: 'stale', readonly lockPath: string, readonly owner: WriteBoundaryOwner, readonly recovery: string }
    | { readonly status: 'unsafe-to-recover', readonly lockPath: string, readonly owner?: WriteBoundaryOwner, readonly recovery: string }

interface BoundaryClaim {
  readonly lockPath: string
  readonly owner: WriteBoundaryOwner
  readonly ownerPath: string
}

type OwnerState = 'alive' | 'dead' | 'unknown'

const decodeWriteBoundaryOwner = Schema.decodeUnknownSync(WriteBoundaryOwnerSchema, {
  errors: 'all',
  onExcessProperty: 'error',
})

function makeOwner(controlRoot: string): WriteBoundaryOwner {
  return {
    schemaVersion: WRITE_BOUNDARY_SCHEMA_VERSION,
    controlRoot,
    hostname: hostname(),
    pid: process.pid,
    processStartedAtEpochMs: PROCESS_STARTED_AT_EPOCH_MS,
    acquiredAtEpochMs: Math.round(performance.timeOrigin + performance.now()),
    nonce: randomBytes(16).toString('hex'),
  }
}

function parseOwner(source: string): WriteBoundaryOwner | undefined {
  try {
    const owner = decodeWriteBoundaryOwner(decodeJson(source))
    if (owner.pid <= 0 || !NONCE_PATTERN.test(owner.nonce))
      return undefined
    return owner
  }
  catch {
    return undefined
  }
}

function ownerState(owner: WriteBoundaryOwner): OwnerState {
  if (owner.hostname !== hostname())
    return 'unknown'
  if (owner.pid === process.pid && owner.processStartedAtEpochMs !== PROCESS_STARTED_AT_EPOCH_MS)
    return 'dead'
  try {
    process.kill(owner.pid, 0)
    return 'alive'
  }
  catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ESRCH' ? 'dead' : 'unknown'
  }
}

export function targetWriteBoundaryPath(controlRoot: string, path: Path.Path): string {
  return path.join(path.dirname(controlRoot), `.prelude-lock-${path.basename(controlRoot)}`)
}

function ownerCandidatePath(lockPath: string, owner: WriteBoundaryOwner): string {
  return `${lockPath}.owner-${owner.nonce}`
}

function recoveryPath(lockPath: string): string {
  return `${lockPath}.recovery`
}

function inspectLock(
  controlRoot: string,
  lockPath: string,
): Effect.Effect<TargetWriteBoundaryDiagnosis, never, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    if (!(yield* fs.exists(lockPath).pipe(Effect.orElseSucceed(() => false))))
      return { status: 'available', lockPath }

    const source = yield* Effect.result(fs.readFileString(lockPath))
    if (Result.isFailure(source)) {
      return {
        status: 'unsafe-to-recover',
        lockPath,
        recovery: `Owner evidence is unreadable (${errorMessage(source.failure)}). Verify that no apply is running, then remove only ${lockPath}.`,
      }
    }
    const owner = parseOwner(source.success)
    if (owner === undefined) {
      return {
        status: 'unsafe-to-recover',
        lockPath,
        recovery: `Owner evidence is invalid. Verify that no apply is running, then remove only ${lockPath}.`,
      }
    }
    if (owner.controlRoot !== controlRoot) {
      return {
        status: 'unsafe-to-recover',
        lockPath,
        owner,
        recovery: `Owner evidence names a different Control Root (${owner.controlRoot}); automatic recovery is unsafe.`,
      }
    }

    const state = ownerState(owner)
    if (state === 'alive') {
      return {
        status: 'held',
        lockPath,
        owner,
        recovery: `Writer is live on ${owner.hostname} with pid=${owner.pid}; wait for it to finish.`,
      }
    }
    if (state === 'dead') {
      return {
        status: 'stale',
        lockPath,
        owner,
        recovery: `Same-host owner pid=${owner.pid} is not running; the lock is automatically recoverable by the next apply.`,
      }
    }
    return {
      status: 'unsafe-to-recover',
      lockPath,
      owner,
      recovery: `Owner is on another host or its process state is not observable (${owner.hostname}, pid=${owner.pid}); automatic recovery is unsafe.`,
    }
  })
}

export function diagnoseTargetWriteBoundary(
  controlRoot: string,
): Effect.Effect<TargetWriteBoundaryDiagnosis, never, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const lockPath = targetWriteBoundaryPath(controlRoot, path)
    const recovering = recoveryPath(lockPath)
    if (yield* fs.exists(recovering).pipe(Effect.orElseSucceed(() => false))) {
      const diagnosis = yield* inspectLock(controlRoot, recovering)
      if (diagnosis.status === 'available') {
        return {
          status: 'unsafe-to-recover',
          lockPath,
          recovery: `Recovery guard disappeared while inspecting ${recovering}; retry apply.`,
        }
      }
      const recovery = diagnosis.status === 'stale'
        ? `A stale recovery guard remains at ${recovering}. Verify that no apply is running, remove only ${recovering}, then retry apply; recovery guards are never deleted automatically.`
        : `Write-boundary recovery is in progress or cannot be diagnosed safely at ${recovering}. ${diagnosis.recovery}`
      return diagnosis.owner === undefined
        ? { status: 'unsafe-to-recover', lockPath, recovery }
        : { status: 'unsafe-to-recover', lockPath, owner: diagnosis.owner, recovery }
    }
    return yield* inspectLock(controlRoot, lockPath)
  })
}

function claimError(message: string, detail: string): PreludeError {
  return preludeError('apply', message, detail)
}

function createClaim(
  lockPath: string,
  controlRoot: string,
): Effect.Effect<BoundaryClaim | undefined, PreludeError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const owner = makeOwner(controlRoot)
    const ownerPath = ownerCandidatePath(lockPath, owner)
    yield* fs.writeFileString(ownerPath, `${encodeJson(owner)}\n`, { flag: 'wx', mode: 0o600 }).pipe(
      Effect.mapError(error => claimError('Cannot prepare Target write boundary owner evidence', errorMessage(error))),
    )
    const linked = yield* Effect.result(fs.link(ownerPath, lockPath))
    if (Result.isSuccess(linked))
      return { lockPath, owner, ownerPath }

    yield* fs.remove(ownerPath, { force: true }).pipe(Effect.ignore)
    if (yield* fs.exists(lockPath).pipe(Effect.orElseSucceed(() => false)))
      return undefined
    return yield* claimError('Cannot acquire Target write boundary', errorMessage(linked.failure))
  })
}

function releaseClaim(claim: BoundaryClaim): Effect.Effect<void, never, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const current = yield* Effect.result(fs.readFileString(claim.lockPath))
    if (Result.isSuccess(current)) {
      const owner = parseOwner(current.success)
      if (owner?.nonce === claim.owner.nonce && owner.controlRoot === claim.owner.controlRoot)
        yield* fs.remove(claim.lockPath, { force: true }).pipe(Effect.ignore)
    }
    yield* fs.remove(claim.ownerPath, { force: true }).pipe(Effect.ignore)
  })
}

function failureForDiagnosis(diagnosis: Exclude<TargetWriteBoundaryDiagnosis, { readonly status: 'available' }>): PreludeError {
  const owner = diagnosis.owner
  const evidence = owner === undefined
    ? `lock=${diagnosis.lockPath}`
    : `lock=${diagnosis.lockPath} host=${owner.hostname} pid=${owner.pid} processStartedAt=${owner.processStartedAtEpochMs} acquiredAt=${owner.acquiredAtEpochMs} nonce=${owner.nonce}`
  if (diagnosis.status === 'held')
    return claimError('Target write boundary is already held', `${evidence}. ${diagnosis.recovery}`)
  if (diagnosis.status === 'stale')
    return claimError('Target write boundary changed during recovery', `${evidence}. ${diagnosis.recovery} Retry apply.`)
  return claimError('Target write boundary cannot be recovered safely', `${evidence}. ${diagnosis.recovery}`)
}

function failureForRecoveryGuard(
  guardPath: string,
  diagnosis: Exclude<TargetWriteBoundaryDiagnosis, { readonly status: 'available' }>,
): PreludeError {
  const owner = diagnosis.owner
  const evidence = owner === undefined
    ? `guard=${guardPath}`
    : `guard=${guardPath} host=${owner.hostname} pid=${owner.pid} processStartedAt=${owner.processStartedAtEpochMs} acquiredAt=${owner.acquiredAtEpochMs} nonce=${owner.nonce}`
  if (diagnosis.status === 'held')
    return claimError('Target write-boundary recovery is already in progress', `${evidence}. ${diagnosis.recovery}`)
  if (diagnosis.status === 'stale') {
    return claimError(
      'Stale Target write-boundary recovery guard requires operator recovery',
      `${evidence}. Verify that no apply is running, remove only ${guardPath}, then retry apply; recovery guards are never deleted automatically.`,
    )
  }
  return claimError('Target write-boundary recovery guard cannot be recovered safely', `${evidence}. ${diagnosis.recovery}`)
}

function removeStaleClaim(
  controlRoot: string,
  diagnosis: Extract<TargetWriteBoundaryDiagnosis, { readonly status: 'stale' }>,
): Effect.Effect<void, PreludeError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const latest = yield* inspectLock(controlRoot, diagnosis.lockPath)
    if (latest.status === 'available')
      return
    if (latest.status !== 'stale' || latest.owner.nonce !== diagnosis.owner.nonce)
      return yield* failureForDiagnosis(latest)
    yield* fs.remove(diagnosis.lockPath, { force: true }).pipe(
      Effect.mapError(error => claimError('Cannot remove stale Target write boundary', errorMessage(error))),
    )
    yield* fs.remove(ownerCandidatePath(diagnosis.lockPath, diagnosis.owner), { force: true }).pipe(Effect.ignore)
  })
}

function recoverStaleBoundary(
  controlRoot: string,
  lockPath: string,
): Effect.Effect<void, PreludeError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const guardPath = recoveryPath(lockPath)
    const guard = yield* createClaim(guardPath, controlRoot)
    if (guard === undefined) {
      const diagnosis = yield* inspectLock(controlRoot, guardPath)
      return yield* diagnosis.status === 'available'
        ? claimError('Cannot acquire Target write-boundary recovery guard', guardPath)
        : failureForRecoveryGuard(guardPath, diagnosis)
    }
    yield* Effect.acquireUseRelease(
      Effect.succeed(guard),
      () => Effect.gen(function* () {
        const diagnosis = yield* inspectLock(controlRoot, lockPath)
        if (diagnosis.status === 'available')
          return
        if (diagnosis.status !== 'stale')
          return yield* failureForDiagnosis(diagnosis)
        yield* removeStaleClaim(controlRoot, diagnosis)
      }),
      releaseClaim,
    )
  })
}

function acquireBoundary(
  controlRoot: string,
): Effect.Effect<BoundaryClaim, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const lockPath = targetWriteBoundaryPath(controlRoot, path)
    const guardPath = recoveryPath(lockPath)

    for (let attempt = 0; attempt < 4; attempt++) {
      if (yield* fs.exists(guardPath).pipe(Effect.orElseSucceed(() => false))) {
        const diagnosis = yield* inspectLock(controlRoot, guardPath)
        if (diagnosis.status !== 'available')
          return yield* failureForRecoveryGuard(guardPath, diagnosis)
      }

      const claim = yield* createClaim(lockPath, controlRoot)
      if (claim !== undefined) {
        if (!(yield* fs.exists(guardPath).pipe(Effect.orElseSucceed(() => false))))
          return claim
        yield* releaseClaim(claim)
        continue
      }

      const diagnosis = yield* inspectLock(controlRoot, lockPath)
      if (diagnosis.status === 'available')
        continue
      if (diagnosis.status !== 'stale')
        return yield* failureForDiagnosis(diagnosis)
      yield* recoverStaleBoundary(controlRoot, lockPath)
    }
    return yield* claimError('Cannot acquire Target write boundary', `Lock state kept changing at ${lockPath}; retry apply.`)
  })
}

export function withTargetWriteBoundary<A, E, R>(
  controlRoot: string,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | PreludeError, R | FileSystem.FileSystem | Path.Path> {
  return Effect.acquireUseRelease(
    acquireBoundary(controlRoot),
    () => effect,
    releaseClaim,
  )
}
