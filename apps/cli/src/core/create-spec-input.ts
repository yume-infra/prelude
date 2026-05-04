import type { ProjectName } from '@/brand/project-name'
import type { CreateSpec } from '@/schema/create-spec'
import type { CodeQuality, Linting, ProjectConfig } from '@/schema/project-config'
import { readFileSync } from 'node:fs'
import { Effect, ParseResult, Schema } from 'effect'
import { SchemaContractError } from '@/core/errors'
import {
  createSpecToProjectConfig,
  decodeCreateSpec,
  formatCreateSpecError,
} from '@/schema/create-spec'
import { decodeProjectConfig, formatProjectConfigError } from '@/schema/project-config'

export interface CreateSpecInputOptions {
  readonly name: ProjectName
  readonly git?: boolean
  readonly linting?: Linting
  readonly codeQuality?: readonly CodeQuality[]
}

function formatUnknownError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isInlineJsonSpecInput(input: string) {
  return input.trimStart().startsWith('{')
}

function readSpecInput(input: string) {
  return isInlineJsonSpecInput(input) ? input : readFileSync(input, 'utf8')
}

const decodeJsonSpecInput = Schema.decodeUnknown(Schema.parseJson(Schema.Unknown), { errors: 'all' })

function decodeJsonContent(content: string) {
  return decodeJsonSpecInput(content).pipe(
    Effect.mapError(error => new SchemaContractError({
      schema: 'CreateSpec',
      message: `CreateSpec: failed to parse --spec input: ${ParseResult.TreeFormatter.formatErrorSync(error)}`,
      issueCount: ParseResult.ArrayFormatter.formatErrorSync(error).length,
    })),
  )
}

function parseSpecInput(input: string) {
  return Effect.try({
    try: () => readSpecInput(input),
    catch: error => new SchemaContractError({
      schema: 'CreateSpec',
      message: `CreateSpec: failed to read --spec input: ${formatUnknownError(error)}`,
      issueCount: 1,
    }),
  }).pipe(Effect.flatMap(decodeJsonContent))
}

function decodeSpecInput(input: unknown) {
  return decodeCreateSpec(input).pipe(
    Effect.mapError(error => new SchemaContractError({
      schema: 'CreateSpec',
      message: formatCreateSpecError(error),
      issueCount: ParseResult.ArrayFormatter.formatErrorSync(error).length,
    })),
  )
}

function adaptSpecInput(input: CreateSpec, options: CreateSpecInputOptions) {
  return Effect.try({
    try: () => createSpecToProjectConfig(input, options),
    catch: error => new SchemaContractError({
      schema: 'CreateSpec',
      message: `CreateSpec: ${formatUnknownError(error)}`,
      issueCount: 1,
    }),
  })
}

function decodeAdaptedProjectConfig(input: ProjectConfig) {
  return decodeProjectConfig(input).pipe(
    Effect.mapError(error => new SchemaContractError({
      schema: 'ProjectConfig',
      message: formatProjectConfigError(error),
      issueCount: ParseResult.ArrayFormatter.formatErrorSync(error).length,
    })),
  )
}

export function loadProjectConfigFromCreateSpecInput(input: string, options: CreateSpecInputOptions) {
  return parseSpecInput(input).pipe(
    Effect.flatMap(decodeSpecInput),
    Effect.flatMap(spec => adaptSpecInput(spec, options)),
    Effect.flatMap(decodeAdaptedProjectConfig),
  )
}
