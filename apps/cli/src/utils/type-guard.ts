import type {
  CliProjectConfig,
  LibraryProjectConfig,
  NodeProjectConfig,
  ProjectConfig,
  ReactProjectConfig,
  VueProjectConfig,
  WorkspaceRootConfig,
} from '@/schema/project-config'

export function isVueProject(config: ProjectConfig): config is VueProjectConfig {
  return (config as VueProjectConfig).type === 'vue'
}

export function isReactProject(config: ProjectConfig): config is ReactProjectConfig {
  return (config as ReactProjectConfig).type === 'react'
}

export function isWorkspaceRootProject(config: ProjectConfig): config is WorkspaceRootConfig {
  return (config as WorkspaceRootConfig).type === 'workspace-root'
}

export function isNodeProject(config: ProjectConfig): config is NodeProjectConfig {
  return (config as NodeProjectConfig).type === 'node'
}

export function isCliProject(config: ProjectConfig): config is CliProjectConfig {
  return (config as CliProjectConfig).type === 'cli'
}

export function isLibraryProject(config: ProjectConfig): config is LibraryProjectConfig {
  return (config as LibraryProjectConfig).type === 'library'
}

export function isFrontendProject(config: ProjectConfig): config is VueProjectConfig | ReactProjectConfig {
  return isVueProject(config) || isReactProject(config)
}

export function isNodeRuntimeProject(config: ProjectConfig): config is NodeProjectConfig | CliProjectConfig {
  return isNodeProject(config) || isCliProject(config)
}
