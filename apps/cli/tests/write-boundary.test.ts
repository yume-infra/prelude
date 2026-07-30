import { hostname } from 'node:os'

import { NodeServices } from '@effect/platform-node'
import { describe, expect, layer } from '@effect/vitest'
import { Effect, FileSystem, Path } from 'effect'

import { planConvergence } from '../src/convergence.js'
import { encodeJson } from '../src/json.js'
import { applyConvergence } from '../src/runtime.js'
import {
  diagnoseTargetWriteBoundary,
  targetWriteBoundaryPath,
  withTargetWriteBoundary,
} from '../src/write-boundary.js'

const impossiblePid = 2_147_483_647

describe('Target write boundary', () => {
  layer(NodeServices.layer)((it) => {
    it.effect('blocks a second writer while the owner process is live', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-write-boundary-live-' })

      yield* withTargetWriteBoundary(root, Effect.gen(function* () {
        const diagnosis = yield* diagnoseTargetWriteBoundary(root)
        expect(diagnosis.status).toBe('held')
        if (diagnosis.status === 'held') {
          expect(diagnosis.owner.pid).toBe(process.pid)
          expect(diagnosis.owner.controlRoot).toBe(root)
        }

        const failure = yield* Effect.flip(withTargetWriteBoundary(root, Effect.void))
        expect(failure.message).toBe('Target write boundary is already held')
        expect(failure.detail).toContain(`pid=${process.pid}`)
      }))

      expect((yield* diagnoseTargetWriteBoundary(root)).status).toBe('available')
    })))

    it.effect('diagnoses and recovers a lock whose same-host owner is dead', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-write-boundary-stale-' })
      const lockPath = targetWriteBoundaryPath(root, path)
      yield* fs.writeFileString(lockPath, `${encodeJson({
        schemaVersion: 1,
        controlRoot: root,
        hostname: hostname(),
        pid: impossiblePid,
        processStartedAtEpochMs: 0,
        acquiredAtEpochMs: 1,
        nonce: 'a'.repeat(32),
      })}\n`)

      const diagnosis = yield* diagnoseTargetWriteBoundary(root)
      expect(diagnosis.status).toBe('stale')
      if (diagnosis.status === 'stale') {
        expect(diagnosis.owner.pid).toBe(impossiblePid)
        expect(diagnosis.recovery).toContain('automatically recoverable')
      }

      let entered = false
      yield* withTargetWriteBoundary(root, Effect.sync(() => {
        entered = true
      }))
      expect(entered).toBe(true)
      expect(yield* fs.exists(lockPath)).toBe(false)
    })))

    it.effect('does not recover a lock whose owner cannot be proven dead', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-write-boundary-foreign-' })
      const lockPath = targetWriteBoundaryPath(root, path)
      yield* fs.writeFileString(lockPath, `${encodeJson({
        schemaVersion: 1,
        controlRoot: root,
        hostname: 'another-host.invalid',
        pid: impossiblePid,
        processStartedAtEpochMs: 0,
        acquiredAtEpochMs: 1,
        nonce: 'b'.repeat(32),
      })}\n`)

      const diagnosis = yield* diagnoseTargetWriteBoundary(root)
      expect(diagnosis.status).toBe('unsafe-to-recover')
      if (diagnosis.status === 'unsafe-to-recover')
        expect(diagnosis.recovery).toContain('another host')

      const failure = yield* Effect.flip(withTargetWriteBoundary(root, Effect.void))
      expect(failure.message).toBe('Target write boundary cannot be recovered safely')
      expect(yield* fs.exists(lockPath)).toBe(true)
    })))

    it.effect('preserves a legacy directory lock and gives an exact manual recovery path', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-write-boundary-legacy-' })
      const lockPath = targetWriteBoundaryPath(root, path)
      yield* fs.makeDirectory(lockPath)

      const diagnosis = yield* diagnoseTargetWriteBoundary(root)
      expect(diagnosis.status).toBe('unsafe-to-recover')
      if (diagnosis.status === 'unsafe-to-recover') {
        expect(diagnosis.recovery).toContain('Owner evidence is unreadable')
        expect(diagnosis.recovery).toContain(`remove only ${lockPath}`)
      }

      const failure = yield* Effect.flip(withTargetWriteBoundary(root, Effect.void))
      expect(failure.message).toBe('Target write boundary cannot be recovered safely')
      expect(yield* fs.exists(lockPath)).toBe(true)
    })))

    it.effect('does not automatically delete a stale recovery guard', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-write-boundary-stale-recovery-' })
      const lockPath = targetWriteBoundaryPath(root, path)
      const guardPath = `${lockPath}.recovery`
      yield* fs.writeFileString(guardPath, `${encodeJson({
        schemaVersion: 1,
        controlRoot: root,
        hostname: hostname(),
        pid: impossiblePid,
        processStartedAtEpochMs: 0,
        acquiredAtEpochMs: 1,
        nonce: 'c'.repeat(32),
      })}\n`)

      const diagnosis = yield* diagnoseTargetWriteBoundary(root)
      expect(diagnosis.status).toBe('unsafe-to-recover')
      if (diagnosis.status === 'unsafe-to-recover') {
        expect(diagnosis.recovery).toContain(`remove only ${guardPath}`)
        expect(diagnosis.recovery).toContain('never deleted automatically')
      }

      const failure = yield* Effect.flip(withTargetWriteBoundary(root, Effect.void))
      expect(failure.message).toBe('Stale Target write-boundary recovery guard requires operator recovery')
      expect(failure.detail).toContain(`remove only ${guardPath}`)
      expect(yield* fs.exists(guardPath)).toBe(true)
    })))

    it.effect('releases only the lock generation acquired by this writer', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-write-boundary-owner-' })
      const lockPath = targetWriteBoundaryPath(root, path)
      const replacement = `${encodeJson({
        schemaVersion: 1,
        controlRoot: root,
        hostname: 'replacement-host.invalid',
        pid: impossiblePid,
        processStartedAtEpochMs: 0,
        acquiredAtEpochMs: 1,
        nonce: 'c'.repeat(32),
      })}\n`

      yield* withTargetWriteBoundary(root, Effect.gen(function* () {
        yield* fs.remove(lockPath)
        yield* fs.writeFileString(lockPath, replacement)
      }))

      expect(yield* fs.readFileString(lockPath)).toBe(replacement)
    })))

    it.effect('replans after stale recovery and still requires the exact approved hash', () => Effect.scoped(Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-write-boundary-replan-' })
      yield* fs.makeDirectory(path.join(root, '.prelude'))
      yield* fs.writeFileString(
        path.join(root, '.prelude/config.jsonc'),
        '{ "schemaVersion": 2, "integrations": [] }\n',
      )
      const planned = yield* planConvergence(root)
      const controlRoot = planned.controlRoot
      const lockPath = targetWriteBoundaryPath(controlRoot, path)
      const staleOwner = (nonce: string) => `${encodeJson({
        schemaVersion: 1,
        controlRoot,
        hostname: hostname(),
        pid: impossiblePid,
        processStartedAtEpochMs: 0,
        acquiredAtEpochMs: 1,
        nonce,
      })}\n`

      yield* fs.writeFileString(lockPath, staleOwner('d'.repeat(32)))
      const rejected = yield* Effect.flip(applyConvergence(root, 'f'.repeat(64)))
      expect(rejected.message).toBe('Approved execution hash does not match current Target state')
      expect(yield* fs.exists(lockPath)).toBe(false)

      yield* fs.writeFileString(lockPath, staleOwner('e'.repeat(32)))
      const applied = yield* applyConvergence(root, planned.document.executionHash)
      expect(applied.executionHash).toBe(planned.document.executionHash)
      expect(applied.converged).toBe(true)
      expect(yield* fs.exists(lockPath)).toBe(false)
    })))
  })
})
