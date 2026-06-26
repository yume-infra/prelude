import { Effect, Layer, Option, Redacted } from 'effect'
import { FetchHttpClient } from 'effect/unstable/http'
import { OtlpSerialization, OtlpTracer } from 'effect/unstable/observability'
import { AppConfig } from '@/config/app-config'

export const TracingLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* AppConfig

    if (Option.isNone(config.tracingEndpoint))
      return Layer.empty

    const endpoint = Redacted.value(config.tracingEndpoint.value)

    return OtlpTracer.layer({
      url: `${endpoint.replace(/\/$/, '')}/v1/traces`,
      resource: {
        serviceName: '@sayoriqwq/prelude',
      },
    }).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(FetchHttpClient.layer),
    )
  }),
)
