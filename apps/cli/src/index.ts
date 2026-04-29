#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import process from 'node:process'
import { DevTools } from '@effect/experimental'
import { NodeContext, NodeFileSystem, NodeRuntime } from '@effect/platform-node'
import { Effect, Either, Layer, Logger } from 'effect'
import { AppConfig } from '@/config/app-config'
import { parseCliArgs, parseRawCliArgs } from '@/core/cli-args'
import { CliContext, CliContextLive } from '@/core/cli-context'
import { HELP_TEXT } from '@/core/cli-help'
import { OrchestratorLive } from '@/core/services/orchestrator'
import { TracingLive } from '@/core/services/tracing'
import { FsLive } from '~/fs'
import { TemplateEngineLive } from '~/template-engine'
import { showConfigSummary, showWelcome } from './core/compose'
import { collectQuestions } from './core/questions/compose'
import { CommandLive } from './core/services/command'
import { finishProject, generateProject, previewProject } from './core/services/compose'
import { PlanLive } from './core/services/planner'

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
  CommandLive,
  FsLive,
).pipe(Layer.provideMerge(PlatformLayer))

const OrchestratorLayer = OrchestratorLive.pipe(
  Layer.provideMerge(
    PlanLive.pipe(
      Layer.provideMerge(
        TemplateEngineLive.pipe(
          Layer.provideMerge(BaseLayer),
        ),
      ),
    ),
  ),
)

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

const CliContextLayer = CliContextLive({
  args: decodedCliArgs.right,
  isInteractive: decodedCliArgs.right.preset === undefined || decodedCliArgs.right.name === undefined,
})

const main = Effect.gen(function* () {
  const cli = yield* CliContext

  if (cli.isInteractive) {
    yield* showWelcome
  }

  const projectConfig = yield* collectQuestions
  yield* showConfigSummary(projectConfig)

  if (cli.args.dryRun) {
    const preview = yield* previewProject(projectConfig)
    yield* Effect.sync(() => console.log(preview))
    return
  }

  const plan = yield* generateProject(projectConfig)
  yield* finishProject(projectConfig, plan, {
    rollbackOnFailure: cli.args.rollback ?? true,
  })
})

const program = main.pipe(
  Effect.provide(Layer.mergeAll(BaseLayer, OrchestratorLayer, CliContextLayer)),
)

// https://effect.website/docs/platform/runtime/#running-your-main-program-with-runmain
NodeRuntime.runMain(program)
