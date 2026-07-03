import { assert, describe, it } from '@effect/vitest'
import { ConfigProvider, Effect, Exit, Layer, Option, Redacted } from 'effect'
import { AppConfig } from '../../src/config/app-config'

function appConfigTestLayer(input: Record<string, unknown>) {
  return AppConfig.Default.pipe(
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(input))),
  )
}

describe('appConfig', () => {
  it.layer(appConfigTestLayer({
    LOG_LEVEL: 'Info',
    DEFAULT_CONCURRENCY: '4',
    OTEL_EXPORTER_OTLP_ENDPOINT: 'https://collector.example',
    DEBUG: 'true',
  }))((it) => {
    it.effect('reads runtime settings from ConfigProvider.fromUnknown', () => Effect.gen(function* () {
      const config = yield* Effect.service(AppConfig)

      assert.strictEqual(config.logLevel, 'Info')
      assert.strictEqual(config.defaultConcurrency, 4)
      assert.strictEqual(config.debug, true)
      assert.strictEqual(Option.isSome(config.tracingEndpoint), true)

      if (Option.isNone(config.tracingEndpoint)) {
        throw new Error('expected tracing endpoint to be present')
      }

      assert.strictEqual(Redacted.value(config.tracingEndpoint.value), 'https://collector.example')
    }))
  })

  it.layer(appConfigTestLayer({}))((it) => {
    it.effect('falls back to defaults when config values are missing', () => Effect.gen(function* () {
      const config = yield* Effect.service(AppConfig)

      assert.strictEqual(config.logLevel, 'Debug')
      assert.strictEqual(config.defaultConcurrency, 8)
      assert.strictEqual(config.debug, false)
      assert.strictEqual(Option.isNone(config.tracingEndpoint), true)
    }))
  })

  it.effect('rejects non-positive concurrency at the config boundary', () => Effect.gen(function* () {
    const exit = yield* Effect.exit(
      Layer.build(appConfigTestLayer({
        DEFAULT_CONCURRENCY: '0',
      })).pipe(Effect.scoped),
    )

    assert.strictEqual(Exit.isFailure(exit), true)
  }))
})
