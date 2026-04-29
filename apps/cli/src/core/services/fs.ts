import * as fs from 'node:fs/promises'
import { FileSystem } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { FileIOError } from '@/core/errors'

// 借助平台能力，但转化为领域错误
interface FsServiceShape {
  readonly exists: (path: string) => Effect.Effect<boolean, FileIOError>
  readonly readFileString: (path: string) => Effect.Effect<string, FileIOError>
  readonly writeFileString: (path: string, content: string) => Effect.Effect<void, FileIOError>
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, FileIOError>
  readonly writeFile: (path: string, data: Uint8Array) => Effect.Effect<void, FileIOError>
  readonly readDirectory: (path: string) => Effect.Effect<readonly string[], FileIOError>
  readonly makeDirectory: (
    path: string,
    options?: { recursive?: boolean },
  ) => Effect.Effect<void, FileIOError>
  readonly ensureDir: (path: string) => Effect.Effect<void, FileIOError>
  readonly remove: (
    path: string,
    options?: { recursive?: boolean, force?: boolean },
  ) => Effect.Effect<void, FileIOError>
  readonly copyFile: (src: string, dest: string) => Effect.Effect<void, FileIOError>
  readonly chmod: (path: string, mode: number) => Effect.Effect<void, FileIOError>
}

export class FsService extends Effect.Service<FsService>()('FsService', {
  effect: Effect.gen(function* () {
    const platformFs = yield* FileSystem.FileSystem

    const mapErr = (
      op: FileIOError['op'],
      path: string,
    ) => (e: unknown) =>
      new FileIOError({
        op,
        path,
        message: `${op} failed: \n path: ${path} \n ${String(e)}`,
      })

    const exists: FsServiceShape['exists'] = path =>
      pipe(
        platformFs.exists(path),
        Effect.mapError(mapErr('exists', path)),
        Effect.provideService(FileSystem.FileSystem, platformFs),
      )

    const readFileString: FsServiceShape['readFileString'] = path =>
      pipe(
        platformFs.readFileString(path),
        Effect.mapError(mapErr('read', path)),
        Effect.provideService(FileSystem.FileSystem, platformFs),
      )

    const writeFileString: FsServiceShape['writeFileString'] = (path, content) =>
      pipe(
        platformFs.writeFileString(path, content),
        Effect.mapError(mapErr('write', path)),
        Effect.provideService(FileSystem.FileSystem, platformFs),
      )

    const readFile: FsServiceShape['readFile'] = path =>
      pipe(
        platformFs.readFile(path),
        Effect.mapError(mapErr('read', path)),
        Effect.provideService(FileSystem.FileSystem, platformFs),
      )

    const writeFile: FsServiceShape['writeFile'] = (path, data) =>
      pipe(
        platformFs.writeFile(path, data),
        Effect.mapError(mapErr('write', path)),
        Effect.provideService(FileSystem.FileSystem, platformFs),
      )

    const readDirectory: FsServiceShape['readDirectory'] = path =>
      pipe(
        platformFs.readDirectory(path),
        Effect.mapError(mapErr('read', path)),
        Effect.provideService(FileSystem.FileSystem, platformFs),
      )

    const makeDirectory: FsServiceShape['makeDirectory'] = (path, options) =>
      pipe(
        platformFs.makeDirectory(path, options),
        Effect.mapError(mapErr('mkdir', path)),
        Effect.provideService(FileSystem.FileSystem, platformFs),
      )

    const ensureDir: FsServiceShape['ensureDir'] = path =>
      makeDirectory(path, { recursive: true })

    const remove: FsServiceShape['remove'] = (path, options) =>
      pipe(
        platformFs.remove(path, options),
        Effect.mapError(mapErr('remove', path)),
        Effect.provideService(FileSystem.FileSystem, platformFs),
      )

    const copyFile: FsServiceShape['copyFile'] = (src, dest) =>
      pipe(
        platformFs.copyFile(src, dest),
        Effect.mapError(mapErr('copy', dest)),
        Effect.provideService(FileSystem.FileSystem, platformFs),
      )

    const chmod: FsServiceShape['chmod'] = (path, mode) =>
      Effect.tryPromise({
        try: () => fs.chmod(path, mode),
        catch: mapErr('chmod', path),
      })

    return { exists, readFileString, writeFileString, readFile, writeFile, readDirectory, makeDirectory, ensureDir, remove, copyFile, chmod } satisfies FsServiceShape
  }),
}) {}

export const FsLive = FsService.Default
