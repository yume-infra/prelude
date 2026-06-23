import type { ProjectConfig } from '../schema/project-config'
import { intro } from '@clack/prompts'
import { Effect, pipe } from 'effect'

export const showWelcome = Effect.sync(() => {
  intro('welcome to @sayoriqwq/prelude')
})

// for debugging
function formatConfigSummary(config: ProjectConfig) {
  const baseInfo = [
    '\n📋 Project Configuration:',
    `  Name: ${config.name}`,
    `  Type: ${config.type}`,
    `  Language: ${config.language}`,
    `  Git: ${config.git ? 'Yes' : 'No'}`,
    `  Linting: ${config.linting}`,
  ]

  if (config.type === 'vue') {
    return [
      ...baseInfo,
      `  Build Tool: ${config.buildTool}`,
      `  Router: ${config.router ? 'Yes' : 'No'}`,
      `  State Management: ${config.stateManagement}`,
      `  CSS Preprocessor: ${config.cssPreprocessor}`,
      `  CSS Framework: ${config.cssFramework}`,
    ]
  }
  else if (config.type === 'react') {
    return [
      ...baseInfo,
      `  Build Tool: ${config.buildTool}`,
      `  Router: ${config.router}`,
      `  State Management: ${config.stateManagement}`,
      `  CSS Preprocessor: ${config.cssPreprocessor}`,
      `  CSS Framework: ${config.cssFramework}`,
    ]
  }
  else if (config.type === 'workspace-root') {
    return [
      ...baseInfo,
      `  Package Manager: ${config.packageManager}`,
      `  Packages: ${config.packages.length}`,
    ]
  }
  else if (config.type === 'node') {
    return [
      ...baseInfo,
      '  Runtime: Node.js',
      '  Build: tsdown',
    ]
  }
  else if (config.type === 'cli') {
    return [
      ...baseInfo,
      '  Runtime: Node.js',
      `  Bin: ${config.name}`,
      '  Build: tsdown',
    ]
  }
  else if (config.type === 'library') {
    return [
      ...baseInfo,
      `  Runtime: ${config.runtime}`,
      '  Build: tsdown',
    ]
  }

  return baseInfo
}

export function showConfigSummary(projectConfig: ProjectConfig) {
  return pipe(
    formatConfigSummary(projectConfig),
    Effect.forEach(line => Effect.logInfo(line), { discard: true }),
  )
}
