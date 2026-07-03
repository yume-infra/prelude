import type { CreateFs, WriteOperation, WritePlan } from './model'
import { Effect } from 'effect'
import { makeTargetDir } from '@/brand/target-dir'
import { pathDirname, pathJoin } from '@/core/path-utils'
import { upsertManagedBlock } from './managed-block'

function encodeJson(value: Record<string, unknown>) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function resolveTargetPath(baseDir: string, relativePath: string) {
  return pathJoin(baseDir, relativePath)
}

const writeOperation = Effect.fn('writeOperation')(
  function* (fs: CreateFs, baseDir: string, operation: WriteOperation) {
    const targetPath = resolveTargetPath(baseDir, operation.path)

    yield* fs.ensureDir(pathDirname(targetPath))

    switch (operation.kind) {
      case 'writeStructuredFile':
        yield* fs.writeFileString(targetPath, encodeJson(operation.value))
        return
      case 'writeManagedFile':
        yield* fs.writeFileString(targetPath, operation.content)
        return
      case 'writeManagedBlock': {
        const exists = yield* fs.exists(targetPath)
        const current = exists ? yield* fs.readFileString(targetPath) : ''
        yield* fs.writeFileString(targetPath, upsertManagedBlock(current, operation, operation.content))
        return
      }
      case 'writeGeneratedUserFile':
        yield* fs.writeFileString(targetPath, operation.content)
    }
  },
)

export function applyWritePlan(fs: CreateFs, baseDir: string, plan: WritePlan) {
  return Effect.forEach(
    plan.operations,
    operation => writeOperation(fs, baseDir, operation),
    { concurrency: 1, discard: true },
  )
}

export function writeManifest(fs: CreateFs, baseDir: string, content: string) {
  const manifestPath = resolveTargetPath(baseDir, '.prelude/manifest.json')

  return fs.ensureDir(pathDirname(manifestPath)).pipe(
    Effect.andThen(fs.writeFileString(makeTargetDir(manifestPath), content)),
  )
}
