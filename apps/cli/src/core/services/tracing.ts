import * as NodeSdk from '@effect/opentelemetry/NodeSdk'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { Effect, Layer, Option, Redacted } from 'effect'
import { AppConfig } from '@/config/app-config'

export const TracingLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* AppConfig

    if (Option.isNone(config.tracingEndpoint))
      return Layer.empty

    const endpoint = Redacted.value(config.tracingEndpoint.value)

    return NodeSdk.layer(() => ({
      resource: {
        serviceName: '@sayoriqwq/prelude',
      },
      spanProcessor: new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${endpoint.replace(/\/$/, '')}/v1/traces`,
        }),
      ),
    }))
  }),
)
