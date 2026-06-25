#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import process from 'node:process'
import { DevTools } from '@effect/experimental'
import { NodeContext, NodeFileSystem, NodeRuntime } from '@effect/platform-node'
import { Effect, Either, Layer, Logger } from 'effect'
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

const DevToolsLive = Layer.unwrapEffect(
  Effect.map(AppConfig, config => (config.debug ? DevTools.layer() : Layer.empty)),
)

const LoggerLevelLive = Layer.unwrapEffect(
  Effect.map(AppConfig, config => Logger.minimumLogLevel(config.logLevel)),
)

const PlatformLayer = Layer.mergeAll(
  NodeFileSystem.layer,
  NodeContext.layer,
  AppConfig.Default,
)

const BaseLayer = Layer.mergeAll(
  DevToolsLive,
  TracingLive,
  LoggerLevelLive,
  Logger.pretty,
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
  Effect.either(parseCliArgs(process.argv.slice(2))),
)

if (Either.isLeft(decodedCliArgs)) {
  console.error(decodedCliArgs.left.message)
  console.error()
  console.error(HELP_TEXT)
  process.exit(2)
}

const cliArgs = decodedCliArgs.right
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
