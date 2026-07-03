import { Effect, Layer } from 'effect'
import { FsService } from '../../src/core/services/fs'
import { EffectHarnessDiscoveryTestLayer } from './effect-harness-discovery'

export function makeFsMockService(
  overrides: Partial<typeof FsService.Service> = {},
) {
  return FsService.of({
    exists: () => Effect.succeed(false),
    readFileString: () => Effect.succeed(''),
    writeFileString: () => Effect.void,
    makeDirectory: () => Effect.void,
    ensureDir: () => Effect.void,
    ...overrides,
  })
}

export function makeFsMockLayer(
  overrides: Partial<typeof FsService.Service> = {},
) {
  return Layer.mergeAll(Layer.succeed(FsService, makeFsMockService(overrides)), EffectHarnessDiscoveryTestLayer)
}
