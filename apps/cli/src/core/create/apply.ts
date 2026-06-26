import type { CreateFs, WriteOperation, WritePlan } from './model'
import * as path from 'node:path'
import { Effect } from 'effect'
import { makeTargetDir } from '@/brand/target-dir'

function encodeJson(value: Record<string, unknown>) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function resolveTargetPath(baseDir: string, relativePath: string) {
  return path.join(baseDir, relativePath)
}

function writeOperation(fs: CreateFs, baseDir: string, operation: WriteOperation) {
  const targetPath = resolveTargetPath(baseDir, operation.path)

  return Effect.gen(function* () {
    yield* fs.ensureDir(path.dirname(targetPath))

    switch (operation.kind) {
      case 'writeStructuredFile':
        yield* fs.writeFileString(targetPath, encodeJson(operation.value))
        return
      case 'writeManagedFile':
        yield* fs.writeFileString(targetPath, operation.content)
        return
      case 'writeGeneratedUserFile':
        yield* fs.writeFileString(targetPath, operation.content)
    }
  })
}

export function applyWritePlan(fs: CreateFs, baseDir: string, plan: WritePlan) {
  return Effect.forEach(
    plan.operations,
    operation => writeOperation(fs, baseDir, operation),
    { concurrency: 1, discard: true },
  )
}

export function writeManifest(fs: CreateFs, baseDir: string, content: string) {
  const manifestPath = resolveTargetPath(baseDir, '.prelude/manifest.json')

  return fs.ensureDir(path.dirname(manifestPath)).pipe(
    Effect.andThen(fs.writeFileString(makeTargetDir(manifestPath), content)),
  )
}
