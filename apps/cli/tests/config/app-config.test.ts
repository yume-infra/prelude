import { ConfigProvider, Effect, Exit, Option, Redacted } from 'effect'
import { describe, expect, it } from 'vitest'
import { AppConfig } from '../../src/config/app-config'

describe('appConfig', () => {
  it('reads runtime settings from ConfigProvider.fromUnknown', async () => {
    const provider = ConfigProvider.fromUnknown({
      LOG_LEVEL: 'Info',
      DEFAULT_CONCURRENCY: '4',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://collector.example',
      DEBUG: 'true',
    })

    const config = await Effect.runPromise(
      Effect.service(AppConfig).pipe(
        Effect.provide(AppConfig.Default),
        Effect.provide(ConfigProvider.layer(provider)),
      ),
    )

    expect(config.logLevel).toBe('Info')
    expect(config.defaultConcurrency).toBe(4)
    expect(config.debug).toBe(true)
    expect(Option.isSome(config.tracingEndpoint)).toBe(true)

    if (Option.isNone(config.tracingEndpoint)) {
      throw new Error('expected tracing endpoint to be present')
    }

    expect(Redacted.value(config.tracingEndpoint.value)).toBe('https://collector.example')
  })

  it('falls back to defaults when config values are missing', async () => {
    const config = await Effect.runPromise(
      Effect.service(AppConfig).pipe(
        Effect.provide(AppConfig.Default),
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
      ),
    )

    expect(config.logLevel).toBe('Debug')
    expect(config.defaultConcurrency).toBe(8)
    expect(config.debug).toBe(false)
    expect(Option.isNone(config.tracingEndpoint)).toBe(true)
  })

  it('rejects non-positive concurrency at the config boundary', async () => {
    const provider = ConfigProvider.fromUnknown({
      DEFAULT_CONCURRENCY: '0',
    })

    const exit = await Effect.runPromiseExit(
      Effect.service(AppConfig).pipe(
        Effect.provide(AppConfig.Default),
        Effect.provide(ConfigProvider.layer(provider)),
      ),
    )

    expect(Exit.isFailure(exit)).toBe(true)
  })
})
