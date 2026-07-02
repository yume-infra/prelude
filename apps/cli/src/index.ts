#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import process from 'node:process'
import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Console, Effect, Layer, Logger, References } from 'effect'
import { DevTools } from 'effect/unstable/devtools'
import { AppConfig } from '@/config/app-config'
import { formatPreludeCommandError, printPreludeCommandHelp, runPreludeCommand, shouldPrintPreludeCommandHelp } from '@/core/cli-command'
import { EffectHarnessProviderDiscoveryService } from '@/core/create/effect-harness-discovery'
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
  EffectHarnessProviderDiscoveryService.Default,
).pipe(Layer.provideMerge(PlatformLayer))

const commandOptions = {
  preludeVersion: readPackageVersion(),
  stdinIsTTY: process.stdin.isTTY === true,
}

const main = runPreludeCommand(commandOptions)

const program = main.pipe(
  Effect.catch((error: unknown) =>
    Effect.gen(function* () {
      yield* Console.error(formatPreludeCommandError(error))
      if (shouldPrintPreludeCommandHelp(error)) {
        yield* Console.error('')
        yield* printPreludeCommandHelp(commandOptions)
      }
      yield* Effect.sync(() => {
        process.exitCode = shouldPrintPreludeCommandHelp(error) ? 2 : 0
      })
    })),
  Effect.provide(BaseLayer),
)

// https://effect.website/docs/platform/runtime/#running-your-main-program-with-runmain
NodeRuntime.runMain(program)
