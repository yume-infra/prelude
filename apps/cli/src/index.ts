#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import process from 'node:process'
import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Effect, Layer, Logger, References } from 'effect'
import { DevTools } from 'effect/unstable/devtools'
import { AppConfig } from '@/config/app-config'
import { runPreludeCommand } from '@/core/cli-command'
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

const main = runPreludeCommand({
  preludeVersion: readPackageVersion(),
  stdinIsTTY: process.stdin.isTTY === true,
})

const program = main.pipe(
  Effect.provide(BaseLayer),
)

// https://effect.website/docs/platform/runtime/#running-your-main-program-with-runmain
NodeRuntime.runMain(program)
