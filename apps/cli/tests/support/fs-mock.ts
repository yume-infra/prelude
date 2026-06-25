import { Effect, Layer } from 'effect'
import { FsService } from '../../src/core/services/fs'

export function makeFsMockLayer(
  overrides: Partial<typeof FsService.Service> = {},
) {
  return Layer.succeed(FsService, FsService.make({
    exists: () => Effect.succeed(false),
    readFileString: () => Effect.succeed(''),
    writeFileString: () => Effect.void,
    makeDirectory: () => Effect.void,
    ensureDir: () => Effect.void,
    ...overrides,
  }))
}
