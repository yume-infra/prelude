import type {
  CapabilityId,
  LogicalSurface,
  ResolvedGraph,
  ResolvedPackage,
} from '../model'
import type { PackageCapabilityContext } from './types'

function surfaceScopeForPackage(pkg: ResolvedPackage) {
  return pkg.path === '.' ? pkg.id : pkg.path
}

function packageManifestScopeForPackage(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'root' : pkg.path
}

function packageManifestSurfaceId(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'package-manifest:root' : `package-manifest:${pkg.path}` as const
}

function packageSurfaceScope(pkg: ResolvedPackage) {
  return pkg.path === '.' ? pkg.id : pkg.path
}

function scopedPath(pkg: ResolvedPackage, filePath: string) {
  return pkg.path === '.' ? filePath : `${pkg.path}/${filePath}`
}

function scopedTypeScriptConfigSurfaceId(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'typescript-config:root' : `typescript-config:${pkg.path}`
}

function scopedTsdownConfigSurfaceId(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'tsdown-config:root' : `tsdown-config:${pkg.path}`
}

export function sourceSurface(scope: string, capability: CapabilityId, filePath: string, materializer: string): LogicalSurface {
  if (scope === 'root' && capability === 'node-backend') {
    return {
      id: 'source:node-backend/src/index.ts',
      materializer,
      owner: 'capability:node-backend',
    }
  }

  if (scope === 'root' && capability === 'library') {
    return {
      id: 'source:library/src/index.ts',
      materializer,
      owner: 'capability:library',
    }
  }

  if (scope === 'root' && capability === 'cli-tool' && filePath === 'src/index.ts') {
    return {
      id: 'source:cli-tool/src/index.ts',
      materializer,
      owner: 'capability:cli-tool',
    }
  }

  if (scope === 'root' && capability === 'cli-tool' && filePath === 'scripts/ensure-shebang.mjs') {
    return {
      id: 'cli-tool-support:scripts/ensure-shebang.mjs',
      materializer,
      owner: 'capability:cli-tool',
    }
  }

  return {
    id: `source:${scope}/${filePath}`,
    materializer,
    owner: `capability:${capability}`,
  }
}

export function typeScriptConfigSurface(scope: string): LogicalSurface {
  return {
    id: `typescript-config:${scope}`,
    materializer: 'typescript-config',
    owner: 'prelude',
  }
}

export function tsdownConfigSurface(scope: string): LogicalSurface {
  return {
    id: `tsdown-config:${scope}`,
    materializer: 'tsdown-config',
    owner: 'prelude',
  }
}

export function reactStaticSurface(scope: string, path: string): LogicalSurface {
  return {
    id: `react-app-static:${scope}/${path}`,
    materializer: 'react-app-static',
    owner: 'capability:react-app',
  }
}

export function reactEntrySurface(scope: string): LogicalSurface {
  return {
    id: `react-app-entry:${scope}`,
    materializer: 'frontend-entry',
    owner: 'capability:react-app',
  }
}

export function reactAppShellSurface(scope: string): LogicalSurface {
  return {
    id: `react-app-shell:${scope}`,
    materializer: 'react-app-shell',
    owner: 'capability:react-app',
  }
}

export function vueEntrySurface(scope: string): LogicalSurface {
  return {
    id: `vue-app-entry:${scope}`,
    materializer: 'frontend-entry',
    owner: 'capability:vue-app',
  }
}

export function vueStaticSurface(scope: string, path: string): LogicalSurface {
  return {
    id: `vue-app-static:${scope}/${path}`,
    materializer: 'vue-app-static',
    owner: 'capability:vue-app',
  }
}

export function vueAppShellSurface(scope: string): LogicalSurface {
  return {
    id: `vue-app-shell:${scope}`,
    materializer: 'vue-app-shell',
    owner: 'capability:vue-app',
  }
}

export function viteConfigSurface(scope: string, owner: string): LogicalSurface {
  return {
    id: `vite-config:${scope}`,
    materializer: 'vite-config',
    owner,
  }
}

export function styleSheetSurface(scope: string, path: 'src/styles.css' | 'src/styles.less', owner: string): LogicalSurface {
  return {
    id: `stylesheet:${scope}/${path}`,
    materializer: 'stylesheet',
    owner,
  }
}

export function makePackageCapabilityContext(graph: ResolvedGraph, pkg: ResolvedPackage): PackageCapabilityContext {
  const packageManifestScope = packageManifestScopeForPackage(pkg)
  const sourceScope = surfaceScopeForPackage(pkg)

  return {
    graph,
    pkg,
    packageId: packageSurfaceScope(pkg),
    packageName: pkg.name,
    packageSurfaceScope: packageSurfaceScope(pkg),
    packageManifestSurfaceId: packageManifestSurfaceId(pkg),
    packageManifestScope,
    sourceScope,
    scopedPath: filePath => scopedPath(pkg, filePath),
    scopedTypeScriptConfigSurfaceId: scopedTypeScriptConfigSurfaceId(pkg),
    scopedTsdownConfigSurfaceId: scopedTsdownConfigSurfaceId(pkg),
  }
}
