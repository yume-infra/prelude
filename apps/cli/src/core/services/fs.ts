import { Context, Effect, Layer, pipe } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import { FileIOError } from '@/core/errors'

// 借助平台能力，但转化为领域错误
interface FsServiceShape {
  readonly exists: (path: string) => Effect.Effect<boolean, FileIOError>
  readonly readFileString: (path: string) => Effect.Effect<string, FileIOError>
  readonly writeFileString: (path: string, content: string) => Effect.Effect<void, FileIOError>
  readonly makeDirectory: (
    path: string,
    options?: { recursive?: boolean },
  ) => Effect.Effect<void, FileIOError>
  readonly ensureDir: (path: string) => Effect.Effect<void, FileIOError>
}

export class FsService extends Context.Service<FsService, FsServiceShape>()('@sayoriqwq/prelude/core/services/fs/FsService') {
  static readonly Default = Layer.effect(
    FsService,
    Effect.gen(function* () {
      const platformFs = yield* FileSystem.FileSystem

      const mapErr = (
        op: FileIOError['op'],
        path: string,
      ) => (e: unknown) =>
        FileIOError.make({
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

      const makeDirectory: FsServiceShape['makeDirectory'] = (path, options) =>
        pipe(
          platformFs.makeDirectory(path, options),
          Effect.mapError(mapErr('mkdir', path)),
          Effect.provideService(FileSystem.FileSystem, platformFs),
        )

      const ensureDir: FsServiceShape['ensureDir'] = path =>
        makeDirectory(path, { recursive: true })

      return FsService.of({ exists, readFileString, writeFileString, makeDirectory, ensureDir } satisfies FsServiceShape)
    }),
  )
}

export const FsLive = FsService.Default
