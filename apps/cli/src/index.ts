#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import process from 'node:process'
import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Effect, Layer, Logger, References, Result } from 'effect'
import { DevTools } from 'effect/unstable/devtools'
import { AppConfig } from '@/config/app-config'
import { parseCliArgs, parseRawCliArgs } from '@/core/cli-args'
import { CliContextLive } from '@/core/cli-context'
import { HELP_TEXT } from '@/core/cli-help'
import { runCreateRoute } from '@/core/create-route'
import { TracingLive } from '@/core/services/tracing'
import { FsLive } from '~/fs'

function readPackageVersion() {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version?: string }

  return packageJson.version ?? '0.0.0'
}

const DevToolsLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* AppConfig
    return config.debug ? DevTools.layer() : Layer.empty
  }),
)

const LoggerLevelLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* AppConfig
    return Layer.succeed(References.MinimumLogLevel, config.logLevel)
  }),
)

const PlatformLayer = Layer.mergeAll(
  NodeServices.layer,
  AppConfig.Default,
)

const BaseLayer = Layer.mergeAll(
  DevToolsLive,
  TracingLive,
  LoggerLevelLive,
  Logger.layer([Logger.consolePretty()]),
  FsLive,
).pipe(Layer.provideMerge(PlatformLayer))

const rawCliArgs = parseRawCliArgs(process.argv.slice(2))

if (rawCliArgs.help) {
  console.log(HELP_TEXT)
  process.exit(0)
}

if (rawCliArgs.version) {
  console.log(readPackageVersion())
  process.exit(0)
}

const decodedCliArgs = Effect.runSync(
  Effect.result(parseCliArgs(process.argv.slice(2))),
)

if (Result.isFailure(decodedCliArgs)) {
  console.error(decodedCliArgs.failure.message)
  console.error()
  console.error(HELP_TEXT)
  process.exit(2)
}

const cliArgs = decodedCliArgs.success
const canPrompt = process.stdin.isTTY === true && !cliArgs.noInput && cliArgs.spec === undefined

const CliContextLayer = CliContextLive({
  args: cliArgs,
  isInteractive: canPrompt,
})

const main = Effect.gen(function* () {
  yield* runCreateRoute({
    preludeVersion: readPackageVersion(),
  })
})

const program = main.pipe(
  Effect.provide(Layer.mergeAll(BaseLayer, CliContextLayer)),
)

// https://effect.website/docs/platform/runtime/#running-your-main-program-with-runmain
NodeRuntime.runMain(program)
