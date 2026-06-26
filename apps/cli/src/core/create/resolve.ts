import type {
  CapabilityId,
  CreateSpec,
  CreateSpecPackage,
  CreateSpecWorkspacePackage,
  JsonCreateSpec,
  LogicalSurface,
  ProviderId,
  ResolvedGraph,
  ResolvedInternalDependency,
  ResolvedPackage,
  ResolvedProvider,
  RootCapabilityId,
} from './model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'
import { effectHarnessResolvedProvider, effectHarnessVerificationId } from './effect-harness-provider'

const packageManifestLogicalSurface = {
  id: 'package-manifest:root',
  materializer: 'package-json',
  owner: 'prelude',
} as const satisfies LogicalSurface

const workspaceManifestLogicalSurface = {
  id: 'workspace-manifest:root',
  materializer: 'workspace-manifest',
  owner: 'prelude',
} as const satisfies LogicalSurface

const generatedRootSourceLogicalSurface = {
  id: 'source:root/src/index.ts',
  materializer: 'generated-user-file',
  owner: 'capability:minimal-node-package',
} as const satisfies LogicalSurface

const generatedEffectSourceLogicalSurface = {
  id: 'source:root/src/index.ts',
  materializer: 'generated-user-file',
  owner: 'capability:effect-package',
} as const satisfies LogicalSurface

const effectTsconfigLogicalSurface = {
  id: 'tsconfig:root',
  materializer: 'generated-user-file',
  owner: 'capability:effect-package',
} as const satisfies LogicalSurface

const rootCapabilityLogicalSurfaces: Partial<Record<RootCapabilityId, LogicalSurface>> = {
  linting: {
    id: 'eslint-root',
    materializer: 'eslint-config',
    owner: 'capability:linting',
  },
  knip: {
    id: 'knip-root',
    materializer: 'knip-config',
    owner: 'capability:knip',
  },
}

const effectHarnessLogicalSurface = {
  id: 'provider:effect-harness',
  materializer: 'provider-artifact',
  owner: 'capability:ai-harness',
} as const satisfies LogicalSurface

const supportedRootCapabilities = ['package-manager:pnpm', 'linting', 'knip', 'dependency-update:taze', 'ai-harness'] as const satisfies readonly RootCapabilityId[]
const supportedPackageCapabilities = ['minimal-node-package', 'react-app', 'react-counter', 'vue-app', 'effect-package', 'node-backend', 'library', 'cli-tool', 'router:react-router', 'router:vue-router', 'state:jotai', 'state:pinia', 'css:less', 'css:tailwind'] as const satisfies readonly CapabilityId[]
const supportedProviders = ['effect-harness'] as const satisfies readonly ProviderId[]

const runtimeCapabilities = [
  'minimal-node-package',
  'react-app',
  'vue-app',
  'effect-package',
  'node-backend',
  'library',
  'cli-tool',
] as const satisfies readonly CapabilityId[]

const minimalVerification = [
  'minimal-create-files-present',
] as const

const minimalLogicalSurfaces = [
  {
    id: 'package-manifest:root',
    materializer: 'package-json',
    owner: 'prelude',
  },
  {
    id: 'source:root/src/index.ts',
    materializer: 'generated-user-file',
    owner: 'capability:minimal-node-package',
  },
] as const satisfies readonly LogicalSurface[]

function isRootCapabilityId(capability: string): capability is RootCapabilityId {
  return supportedRootCapabilities.includes(capability as RootCapabilityId)
}

function isPackageCapabilityId(capability: string): capability is CapabilityId {
  return supportedPackageCapabilities.includes(capability as CapabilityId)
}

function isProviderId(provider: string): provider is ProviderId {
  return supportedProviders.includes(provider as ProviderId)
}

function packageManifestSurface(scope: string): LogicalSurface {
  return scope === 'root'
    ? packageManifestLogicalSurface
    : {
        id: `package-manifest:${scope}`,
        materializer: 'package-json',
        owner: 'prelude',
      }
}

function sourceSurface(scope: string, capability: CapabilityId, filePath: string, materializer: string): LogicalSurface {
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

function typeScriptConfigSurface(scope: string): LogicalSurface {
  return {
    id: `typescript-config:${scope}`,
    materializer: 'typescript-config',
    owner: 'prelude',
  }
}

function tsdownConfigSurface(scope: string): LogicalSurface {
  return {
    id: `tsdown-config:${scope}`,
    materializer: 'tsdown-config',
    owner: 'prelude',
  }
}

function reactStaticSurface(scope: string, path: string): LogicalSurface {
  return {
    id: `react-app-static:${scope}/${path}`,
    materializer: 'generated-user-file',
    owner: 'capability:react-app',
  }
}

function reactEntrySurface(scope: string): LogicalSurface {
  return {
    id: `react-app-entry:${scope}`,
    materializer: 'frontend-entry',
    owner: 'capability:react-app',
  }
}

function reactAppShellSurface(scope: string): LogicalSurface {
  return {
    id: `react-app-shell:${scope}`,
    materializer: 'react-app-shell',
    owner: 'capability:react-app',
  }
}

function vueEntrySurface(scope: string): LogicalSurface {
  return {
    id: `vue-app-entry:${scope}`,
    materializer: 'frontend-entry',
    owner: 'capability:vue-app',
  }
}

function vueStaticSurface(scope: string, path: string): LogicalSurface {
  return {
    id: `vue-app-static:${scope}/${path}`,
    materializer: 'generated-user-file',
    owner: 'capability:vue-app',
  }
}

function vueAppShellSurface(scope: string): LogicalSurface {
  return {
    id: `vue-app-shell:${scope}`,
    materializer: 'vue-app-shell',
    owner: 'capability:vue-app',
  }
}

function viteConfigSurface(scope: string, owner: string): LogicalSurface {
  return {
    id: `vite-config:${scope}`,
    materializer: 'generated-user-file',
    owner,
  }
}

function styleSheetSurface(scope: string, path: 'src/styles.css' | 'src/styles.less', owner: string): LogicalSurface {
  return {
    id: `stylesheet:${scope}/${path}`,
    materializer: 'stylesheet',
    owner,
  }
}

function resolveRootCapabilities(spec: CreateSpec): readonly RootCapabilityId[] {
  const rootCapabilities: RootCapabilityId[] = []

  for (const capability of spec.rootCapabilities) {
    if (isRootCapabilityId(capability) && !rootCapabilities.includes(capability)) {
      rootCapabilities.push(capability)
    }
  }

  return rootCapabilities
}

function resolveProviders(spec: CreateSpec, rootCapabilities: readonly RootCapabilityId[]): readonly ResolvedProvider[] {
  if (spec.topology !== 'single-package') {
    return []
  }
  if (!rootCapabilities.includes('ai-harness') || !spec.providers.includes('effect-harness')) {
    return []
  }

  return [effectHarnessResolvedProvider(spec.package.id)]
}

function surfaceScopeForPackage(pkg: ResolvedPackage) {
  return pkg.path === '.' ? pkg.id : pkg.path
}

function packageManifestScopeForPackage(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'root' : pkg.path
}

function logicalSurfacesForPackage(pkg: ResolvedPackage): readonly LogicalSurface[] {
  const scope = surfaceScopeForPackage(pkg)
  const packageManifestScope = packageManifestScopeForPackage(pkg)
  const surfaces: LogicalSurface[] = [packageManifestSurface(packageManifestScope)]

  if (pkg.capabilities.includes('react-app')) {
    surfaces.push(
      reactStaticSurface(scope, 'index.html'),
      reactEntrySurface(scope),
      reactAppShellSurface(scope),
      viteConfigSurface(scope, 'capability:react-app'),
      typeScriptConfigSurface(packageManifestScope),
    )
  }

  if (pkg.capabilities.includes('vue-app')) {
    surfaces.push(
      vueStaticSurface(scope, 'index.html'),
      vueEntrySurface(scope),
      vueAppShellSurface(scope),
      viteConfigSurface(scope, 'capability:vue-app'),
      typeScriptConfigSurface(packageManifestScope),
    )
  }

  if (pkg.capabilities.includes('css:tailwind')) {
    surfaces.push(styleSheetSurface(scope, 'src/styles.css', 'capability:css:tailwind'))
  }

  if (pkg.capabilities.includes('css:less')) {
    surfaces.push(styleSheetSurface(scope, 'src/styles.less', 'capability:css:less'))
  }

  if (pkg.capabilities.includes('minimal-node-package')) {
    surfaces.push(pkg.path === '.'
      ? generatedRootSourceLogicalSurface
      : sourceSurface(scope, 'minimal-node-package', 'src/index.ts', 'generated-user-file'))
  }
  if (pkg.capabilities.includes('effect-package')) {
    surfaces.push(pkg.path === '.'
      ? generatedEffectSourceLogicalSurface
      : sourceSurface(scope, 'effect-package', 'src/index.ts', 'generated-user-file'))
    surfaces.push(pkg.path === '.'
      ? effectTsconfigLogicalSurface
      : {
          id: `tsconfig:${packageManifestScope}`,
          materializer: 'generated-user-file',
          owner: 'capability:effect-package',
        })
  }
  if (pkg.capabilities.includes('node-backend')) {
    surfaces.push(sourceSurface(pkg.path === '.' ? 'root' : scope, 'node-backend', 'src/index.ts', 'node-backend-source'))
    surfaces.push(typeScriptConfigSurface(packageManifestScope))
    surfaces.push(tsdownConfigSurface(packageManifestScope))
  }
  if (pkg.capabilities.includes('library')) {
    surfaces.push(sourceSurface(pkg.path === '.' ? 'root' : scope, 'library', 'src/index.ts', 'library-source'))
    surfaces.push(typeScriptConfigSurface(packageManifestScope))
    surfaces.push(tsdownConfigSurface(packageManifestScope))
  }
  if (pkg.capabilities.includes('cli-tool')) {
    surfaces.push(sourceSurface(pkg.path === '.' ? 'root' : scope, 'cli-tool', 'src/index.ts', 'cli-tool-source'))
    surfaces.push(sourceSurface(pkg.path === '.' ? 'root' : scope, 'cli-tool', 'scripts/ensure-shebang.mjs', 'cli-tool-support'))
    surfaces.push(typeScriptConfigSurface(packageManifestScope))
    surfaces.push(tsdownConfigSurface(packageManifestScope))
  }

  return surfaces
}

function rootCapabilitySurfaces(rootCapabilities: readonly RootCapabilityId[]): readonly LogicalSurface[] {
  return rootCapabilities.flatMap((capability) => {
    const surface = rootCapabilityLogicalSurfaces[capability]
    return surface ? [surface] : []
  })
}

function logicalSurfacesForSinglePackage(
  pkg: ResolvedPackage,
  rootCapabilities: readonly RootCapabilityId[],
  providers: readonly ResolvedProvider[],
): readonly LogicalSurface[] {
  if (rootCapabilities.length === 0 && pkg.capabilities.includes('minimal-node-package')) {
    return minimalLogicalSurfaces
  }

  const scope = surfaceScopeForPackage(pkg)
  const surfaces: LogicalSurface[] = [packageManifestLogicalSurface]

  if (pkg.capabilities.includes('react-app')) {
    surfaces.push(
      reactStaticSurface(scope, 'index.html'),
      reactEntrySurface(scope),
      reactAppShellSurface(scope),
      viteConfigSurface(scope, 'capability:react-app'),
      typeScriptConfigSurface('root'),
    )
  }

  if (pkg.capabilities.includes('vue-app')) {
    surfaces.push(
      vueStaticSurface(scope, 'index.html'),
      vueEntrySurface(scope),
      vueAppShellSurface(scope),
      viteConfigSurface(scope, 'capability:vue-app'),
      typeScriptConfigSurface('root'),
    )
  }

  if (pkg.capabilities.includes('css:tailwind')) {
    surfaces.push(styleSheetSurface(scope, 'src/styles.css', 'capability:css:tailwind'))
  }

  if (pkg.capabilities.includes('css:less')) {
    surfaces.push(styleSheetSurface(scope, 'src/styles.less', 'capability:css:less'))
  }

  surfaces.push(...rootCapabilitySurfaces(rootCapabilities))

  if (providers.some(provider => provider.id === 'effect-harness')) {
    surfaces.push(effectHarnessLogicalSurface)
  }

  if (pkg.capabilities.includes('minimal-node-package')) {
    surfaces.push(generatedRootSourceLogicalSurface)
  }
  if (pkg.capabilities.includes('effect-package')) {
    surfaces.push(generatedEffectSourceLogicalSurface)
    surfaces.push(effectTsconfigLogicalSurface)
  }
  if (pkg.capabilities.includes('node-backend')) {
    surfaces.push(sourceSurface('root', 'node-backend', 'src/index.ts', 'node-backend-source'))
    surfaces.push(typeScriptConfigSurface('root'))
    surfaces.push(tsdownConfigSurface('root'))
  }
  if (pkg.capabilities.includes('library')) {
    surfaces.push(sourceSurface('root', 'library', 'src/index.ts', 'library-source'))
    surfaces.push(typeScriptConfigSurface('root'))
    surfaces.push(tsdownConfigSurface('root'))
  }
  if (pkg.capabilities.includes('cli-tool')) {
    surfaces.push(sourceSurface('root', 'cli-tool', 'src/index.ts', 'cli-tool-source'))
    surfaces.push(sourceSurface('root', 'cli-tool', 'scripts/ensure-shebang.mjs', 'cli-tool-support'))
    surfaces.push(typeScriptConfigSurface('root'))
    surfaces.push(tsdownConfigSurface('root'))
  }

  return surfaces
}

function logicalSurfacesFor(
  packages: readonly ResolvedPackage[],
  rootCapabilities: readonly RootCapabilityId[],
  providers: readonly ResolvedProvider[],
): readonly LogicalSurface[] {
  if (packages.length === 1 && packages[0]!.path === '.') {
    return logicalSurfacesForSinglePackage(packages[0]!, rootCapabilities, providers)
  }

  return [
    packageManifestLogicalSurface,
    workspaceManifestLogicalSurface,
    ...rootCapabilitySurfaces(rootCapabilities),
    ...packages.flatMap(logicalSurfacesForPackage),
  ]
}

function verificationFor(
  spec: CreateSpec,
  rootCapabilities: readonly RootCapabilityId[],
  providers: readonly ResolvedProvider[],
): readonly string[] {
  const hasRootEngineeringFiles = rootCapabilities.includes('linting') || rootCapabilities.includes('knip')
  const providerVerification = providers.some(provider => provider.id === 'effect-harness')
    ? [effectHarnessVerificationId]
    : []

  if (spec.topology === 'workspace') {
    return hasRootEngineeringFiles
      ? ['workspace-root-files-present', 'workspace-package-files-present', 'root-engineering-files-present']
      : ['workspace-root-files-present', 'workspace-package-files-present']
  }

  if (spec.package.capabilities.includes('react-app')) {
    return hasRootEngineeringFiles
      ? ['react-app-files-present', 'root-engineering-files-present', ...providerVerification]
      : ['react-app-files-present', ...providerVerification]
  }

  if (spec.package.capabilities.includes('vue-app')) {
    return hasRootEngineeringFiles
      ? ['vue-app-files-present', 'root-engineering-files-present', ...providerVerification]
      : ['vue-app-files-present', ...providerVerification]
  }

  if (spec.package.capabilities.includes('node-backend') || spec.package.capabilities.includes('library')) {
    return hasRootEngineeringFiles
      ? ['node-package-files-present', 'root-engineering-files-present', ...providerVerification]
      : ['node-package-files-present', ...providerVerification]
  }

  if (spec.package.capabilities.includes('cli-tool')) {
    return hasRootEngineeringFiles
      ? ['cli-tool-files-present', 'root-engineering-files-present', ...providerVerification]
      : ['cli-tool-files-present', ...providerVerification]
  }

  if (!hasRootEngineeringFiles) {
    return [...minimalVerification, ...providerVerification]
  }

  return [...minimalVerification, 'root-engineering-files-present', ...providerVerification]
}

export function toManifestCreateSpec(spec: CreateSpec): JsonCreateSpec {
  if (spec.topology === 'workspace') {
    return {
      topology: 'workspace',
      packages: spec.packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        capabilities: pkg.capabilities,
        internalDependencies: pkg.internalDependencies.map(dependency => ({
          target: dependency.target,
          ...(dependency.alias === undefined ? {} : { alias: dependency.alias }),
        })),
      })),
      rootCapabilities: spec.rootCapabilities,
      providers: spec.providers,
      overrides: spec.overrides,
    }
  }

  return {
    topology: 'single-package',
    package: {
      id: spec.package.id,
      name: spec.package.name,
      capabilities: spec.package.capabilities,
    },
    rootCapabilities: spec.rootCapabilities,
    providers: spec.providers,
    overrides: spec.overrides,
  }
}

function selectedRuntimeCapabilities(pkg: CreateSpecPackage) {
  return pkg.capabilities.filter(capability => runtimeCapabilities.includes(capability as typeof runtimeCapabilities[number]))
}

function validatePackageCapabilities(pkg: CreateSpecPackage, issues: string[]) {
  const unsupportedPackageCapabilities = pkg.capabilities.filter(capability => !isPackageCapabilityId(capability))
  if (unsupportedPackageCapabilities.length > 0) {
    issues.push(`unsupported package capabilities for ${pkg.id}: ${unsupportedPackageCapabilities.join(', ')}`)
  }

  const selectedRuntimes = selectedRuntimeCapabilities(pkg)
  if (selectedRuntimes.length === 0) {
    issues.push(`one package runtime capability is required for ${pkg.id}: minimal-node-package, react-app, vue-app, effect-package, node-backend, library, or cli-tool`)
  }
  if (selectedRuntimes.length > 1) {
    issues.push(`only one package runtime capability is supported for ${pkg.id}: ${selectedRuntimes.join(', ')}`)
  }
  if (pkg.capabilities.includes('react-counter') && !pkg.capabilities.includes('react-app')) {
    issues.push(`react-counter requires react-app for ${pkg.id}`)
  }
  if (pkg.capabilities.includes('router:react-router') && !pkg.capabilities.includes('react-app')) {
    issues.push(`router:react-router requires react-app for ${pkg.id}`)
  }
  if (pkg.capabilities.includes('state:jotai') && !pkg.capabilities.includes('react-app')) {
    issues.push(`state:jotai requires react-app for ${pkg.id}`)
  }
  if (pkg.capabilities.includes('router:vue-router') && !pkg.capabilities.includes('vue-app')) {
    issues.push(`router:vue-router requires vue-app for ${pkg.id}`)
  }
  if (pkg.capabilities.includes('state:pinia') && !pkg.capabilities.includes('vue-app')) {
    issues.push(`state:pinia requires vue-app for ${pkg.id}`)
  }
  if (pkg.capabilities.includes('css:less') && !pkg.capabilities.includes('react-app') && !pkg.capabilities.includes('vue-app')) {
    issues.push(`css:less requires react-app or vue-app for ${pkg.id}`)
  }
  if (pkg.capabilities.includes('css:tailwind') && !pkg.capabilities.includes('react-app') && !pkg.capabilities.includes('vue-app')) {
    issues.push(`css:tailwind requires react-app or vue-app for ${pkg.id}`)
  }
}

function validateWorkspacePackageGraph(packages: readonly CreateSpecWorkspacePackage[], issues: string[]) {
  const packageIds = new Set<string>()
  const packageNames = new Set<string>()

  for (const pkg of packages) {
    if (!/^[a-z][a-z0-9-]*$/u.test(pkg.id)) {
      issues.push(`workspace package id must be kebab-case: ${pkg.id}`)
    }
    if (packageIds.has(pkg.id)) {
      issues.push(`duplicate workspace package id: ${pkg.id}`)
    }
    packageIds.add(pkg.id)

    if (packageNames.has(pkg.name)) {
      issues.push(`duplicate workspace package name: ${pkg.name}`)
    }
    packageNames.add(pkg.name)
  }

  for (const pkg of packages) {
    for (const dependency of pkg.internalDependencies) {
      const targetExists = dependency.target.by === 'id'
        ? packageIds.has(dependency.target.value)
        : packageNames.has(dependency.target.value)
      if (!targetExists) {
        issues.push(`${pkg.id} internal dependency target not found by ${dependency.target.by}: ${dependency.target.value}`)
        continue
      }
      if (
        (dependency.target.by === 'id' && dependency.target.value === pkg.id)
        || (dependency.target.by === 'name' && dependency.target.value === pkg.name)
      ) {
        issues.push(`${pkg.id} cannot depend on itself`)
      }
    }
  }
}

export function validateCreateSpec(spec: CreateSpec): Effect.Effect<void, SchemaContractError> {
  const issues: string[] = []

  const unsupportedRootCapabilities = spec.rootCapabilities.filter(capability => !isRootCapabilityId(capability))
  if (unsupportedRootCapabilities.length > 0) {
    issues.push(`unsupported root capabilities: ${unsupportedRootCapabilities.join(', ')}`)
  }

  const unsupportedProviders = spec.providers.filter(provider => !isProviderId(provider))
  if (unsupportedProviders.length > 0) {
    issues.push(`unsupported providers: ${unsupportedProviders.join(', ')}`)
  }

  if (spec.topology === 'workspace') {
    if (!Array.isArray(spec.packages)) {
      issues.push('workspace topology requires packages')
    }

    const workspacePackages = Array.isArray(spec.packages) ? spec.packages : []

    for (const pkg of workspacePackages) {
      validatePackageCapabilities(pkg, issues)
    }
    validateWorkspacePackageGraph(workspacePackages, issues)
    if (spec.providers.length > 0 || spec.rootCapabilities.includes('ai-harness')) {
      issues.push('workspace provider orchestration is handled by the ai-harness slice and is not supported here')
    }
  }
  else {
    validatePackageCapabilities(spec.package, issues)
    if (spec.providers.length > 0 && !spec.rootCapabilities.includes('ai-harness')) {
      issues.push('providers require root capability: ai-harness')
    }
    if (spec.rootCapabilities.includes('ai-harness') && spec.providers.length === 0) {
      issues.push('ai-harness requires provider: effect-harness')
    }
    if (spec.rootCapabilities.includes('ai-harness') && spec.providers.length > 1) {
      issues.push(`only one ai-harness provider is supported: ${spec.providers.join(', ')}`)
    }
    if (spec.providers.includes('effect-harness') && !spec.package.capabilities.includes('effect-package')) {
      issues.push('effect-harness requires effect-package')
    }
  }

  if (issues.length > 0) {
    return Effect.fail(new SchemaContractError({
      schema: 'CreateSpec',
      message: `Unsupported CreateSpec for the minimal creation path: ${issues.join('; ')}`,
      issueCount: issues.length,
    }))
  }

  return Effect.void
}

function workspacePackagePath(pkg: CreateSpecWorkspacePackage) {
  return pkg.capabilities.includes('library')
    ? `libs/${pkg.id}`
    : `apps/${pkg.id}`
}

function resolveWorkspaceInternalDependencies(
  pkg: CreateSpecWorkspacePackage,
  packages: readonly CreateSpecWorkspacePackage[],
): readonly ResolvedInternalDependency[] {
  return pkg.internalDependencies.map((dependency) => {
    const target = dependency.target.by === 'id'
      ? packages.find(candidate => candidate.id === dependency.target.value)
      : packages.find(candidate => candidate.name === dependency.target.value)

    if (!target) {
      throw new Error(`unvalidated workspace dependency target: ${dependency.target.value}`)
    }

    return {
      targetPackageId: target.id,
      targetPackageName: target.name,
      dependencyName: dependency.alias ?? target.name,
      range: dependency.alias === undefined ? 'workspace:*' : `workspace:${target.name}@*`,
    }
  })
}

function resolveWorkspacePackages(spec: Extract<CreateSpec, { topology: 'workspace' }>): readonly ResolvedPackage[] {
  return spec.packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    path: workspacePackagePath(pkg),
    capabilities: pkg.capabilities,
    internalDependencies: resolveWorkspaceInternalDependencies(pkg, spec.packages),
  }))
}

function packageCapabilitiesFor(packages: readonly ResolvedPackage[]) {
  return Object.fromEntries(
    packages.map(pkg => [pkg.id, pkg.capabilities]),
  ) as Record<string, readonly CapabilityId[]>
}

export function resolveCreateSpec(spec: CreateSpec): ResolvedGraph {
  const rootCapabilities = resolveRootCapabilities(spec)
  const providers = resolveProviders(spec, rootCapabilities)

  if (spec.topology === 'workspace') {
    const packages = resolveWorkspacePackages(spec)

    return {
      topology: 'workspace',
      rootPackage: {
        id: 'root',
        name: 'workspace-root',
        path: '.',
        capabilities: [],
      },
      packages,
      rootCapabilities,
      packageCapabilities: packageCapabilitiesFor(packages),
      providers,
      logicalSurfaces: logicalSurfacesFor(packages, rootCapabilities, providers),
      verification: verificationFor(spec, rootCapabilities, providers),
    }
  }

  const rootPackage: ResolvedPackage = {
    id: spec.package.id,
    name: spec.package.name,
    path: '.',
    capabilities: spec.package.capabilities,
  }

  return {
    topology: 'single-package',
    rootPackage,
    packages: [],
    rootCapabilities,
    packageCapabilities: {
      [spec.package.id]: spec.package.capabilities,
    },
    providers,
    logicalSurfaces: logicalSurfacesFor([rootPackage], rootCapabilities, providers),
    verification: verificationFor(spec, rootCapabilities, providers),
  }
}
