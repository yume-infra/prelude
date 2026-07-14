#!/usr/bin/env node
/* eslint-disable style/max-statements-per-line */
import process from 'node:process'

import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Console, Effect, Layer } from 'effect'

import { planConvergence } from './convergence.js'
import { errorMessage, preludeError } from './errors.js'
import { stableJson } from './model.js'
import { applyConvergence, changedCount, checkConvergence } from './runtime.js'

function usage(): string { return 'Usage: prelude {plan [--json] | apply --plan-hash <sha256> [--json] | check [--json]}' }

function argumentValue(args: ReadonlyArray<string>, flag: string): string | undefined { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1] }

function writeOutput(text: string) {
  return Effect.callback<void>((resume) => {
    process.stdout.write(`${text}\n`, () => resume(Effect.void))
  })
}

const program = Effect.gen(function* () {
  const args = process.argv.slice(2); const command = args[0]; const json = args.includes('--json'); const controlRoot = process.cwd()
  if (command === 'plan') {
    if (args.some(arg => arg !== 'plan' && arg !== '--json'))
      return yield* preludeError('cli', usage())
    const plan = yield* planConvergence(controlRoot)
    yield* writeOutput(json ? stableJson(plan.document, true) : `Plan ${plan.document.executionHash}\n${changedCount(plan)} output(s) change; ${plan.document.blocked ? 'blocked' : 'ready'}`)
    if (plan.document.blocked)
      process.exitCode = 2
    return
  }
  if (command === 'apply') {
    const hash = argumentValue(args, '--plan-hash')
    if (hash === undefined || !/^[a-f0-9]{64}$/.test(hash) || args.some((arg, index) => arg !== 'apply' && arg !== '--plan-hash' && arg !== hash && arg !== '--json' && index !== args.indexOf('--plan-hash') + 1))
      return yield* preludeError('cli', usage())
    const result = yield* applyConvergence(controlRoot, hash)
    yield* writeOutput(json ? stableJson(result, true) : `Applied ${result.executionHash}: ${result.published} publication(s), ${result.remaining} remaining`)
    if (!result.converged)
      process.exitCode = 2
    return
  }
  if (command === 'check') {
    if (args.some(arg => arg !== 'check' && arg !== '--json'))
      return yield* preludeError('cli', usage())
    const result = yield* checkConvergence(controlRoot, json ? 'ignore' : 'inherit')
    yield* writeOutput(json ? stableJson(result, true) : `Checks passed: ${result.checks.length}`)
    return
  }
  return yield* preludeError('cli', usage())
})

const main = Effect.scoped(Effect.gen(function* () {
  const services = yield* Layer.build(NodeServices.layer)
  return yield* Effect.provide(program, services)
})).pipe(
  Effect.catch((error: unknown) => Console.error(`prelude: ${errorMessage(error)}`).pipe(Effect.andThen(Effect.sync(() => { process.exitCode = 1 })))),
)

NodeRuntime.runMain(main)
