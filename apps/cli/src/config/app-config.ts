import type * as LogLevel from 'effect/LogLevel'
import type * as Redacted from 'effect/Redacted'
import { Config, Context, Effect, Layer, Option, Schema, SchemaIssue } from 'effect'

interface AppConfigShape {
  readonly logLevel: LogLevel.LogLevel
  readonly defaultConcurrency: number
  readonly tracingEndpoint: Option.Option<Redacted.Redacted>
  readonly debug: boolean
}

const DEFAULT_CONCURRENCY = 8
const MAX_CONCURRENCY = 32

export class AppConfig extends Context.Service<AppConfig, AppConfigShape>()('@sayoriqwq/prelude/config/app-config/AppConfig') {
  static readonly Default = Layer.effect(
    AppConfig,
    Config.all({
      logLevel: Config.logLevel('LOG_LEVEL').pipe(Config.withDefault('Debug')),
      defaultConcurrency: Config.int('DEFAULT_CONCURRENCY').pipe(
        Config.withDefault(DEFAULT_CONCURRENCY),
        Config.mapOrFail(value =>
          value >= 1 && value <= MAX_CONCURRENCY
            ? Effect.succeed(value)
            : Effect.fail(new Config.ConfigError(new Schema.SchemaError(new SchemaIssue.InvalidValue(
                Option.some(value),
                { message: `Expected DEFAULT_CONCURRENCY to be between 1 and ${MAX_CONCURRENCY}` },
              ))))),
      ),
      tracingEndpoint: Config.option(Config.redacted('OTEL_EXPORTER_OTLP_ENDPOINT')),
      debug: Config.boolean('DEBUG').pipe(Config.withDefault(false)),
    }).pipe(
      Effect.map(config => AppConfig.of(config satisfies AppConfigShape)),
    ),
  )
}
