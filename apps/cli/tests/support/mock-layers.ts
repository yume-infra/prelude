import type { StandardCommand } from '@effect/platform/Command'
import type Handlebars from 'handlebars'
import type { CommandName } from '../../src/brand/command-name'
import type { TemplatePath } from '../../src/brand/template-path'
import type { FileIOError, TemplateError } from '../../src/core/errors'
import type { ProjectConfig } from '../../src/schema/project-config'
import { Command } from '@effect/platform'
import { Effect, Layer } from 'effect'
import { CommandService } from '../../src/core/services/command'
import { FsService } from '../../src/core/services/fs'
import { TemplateEngineService } from '../../src/core/services/template-engine'

export function makeFsMockLayer(
  overrides: Partial<typeof FsService.Service> = {},
) {
  return Layer.succeed(FsService, FsService.make({
    exists: () => Effect.succeed(false),
    readFileString: () => Effect.succeed(''),
    writeFileString: () => Effect.void,
    readFile: () => Effect.succeed(new Uint8Array()),
    writeFile: () => Effect.void,
    readDirectory: () => Effect.succeed([]),
    makeDirectory: () => Effect.void,
    ensureDir: () => Effect.void,
    remove: () => Effect.void,
    copyFile: () => Effect.void,
    chmod: () => Effect.void,
    ...overrides,
  }))
}

export function makeCommandMockLayer(
  overrides: Partial<typeof CommandService.Service> = {},
) {
  return Layer.succeed(CommandService, CommandService.make({
    make: (cmd: CommandName, ...args: string[]) => Command.make(cmd, ...args) as StandardCommand,
    execute: (_command: StandardCommand) => Effect.succeed(''),
    ...overrides,
  }))
}

export function makeTemplateEngineMockLayer(
  overrides: Partial<typeof TemplateEngineService.Service> = {},
) {
  const template: Handlebars.TemplateDelegate = () => ''

  return Layer.succeed(TemplateEngineService, TemplateEngineService.make({
    registerHelpers: () => Effect.void,
    registerPartials: (_dir: TemplatePath, _namespace: string) => Effect.void,
    prepare: (_config: ProjectConfig, _partialRoot: TemplatePath) => Effect.void,
    compile: (_templatePath: TemplatePath, _config: ProjectConfig) =>
      Effect.succeed(template) as Effect.Effect<Handlebars.TemplateDelegate, TemplateError | FileIOError>,
    render: (_templatePath: TemplatePath, _data: unknown, _config: ProjectConfig) =>
      Effect.succeed(''),
    ...overrides,
  }))
}
