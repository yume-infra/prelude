import type {
  CapabilityContribution,
  EffectHarnessProviderDiscovery,
  JsonValue,
  LifecycleProviderRecord,
  LifecycleSurfaceRecord,
  MaintainProviderReference,
  ProviderArtifactRecord,
  ProviderProjectedContext,
  ResolvedGraph,
  ResolvedProvider,
  VerificationRecord,
} from './model'
import * as fs from 'node:fs'
import * as path from 'node:path'

const effectHarnessContractVersion = '1'
const legacyInlineEffectHarnessProviderVersion = '0.1.0'
const effectHarnessProviderId = 'effect-harness'
const effectHarnessProfile = 'codex-effect-v4'
const effectHarnessProviderPath = '.prelude/providers/effect-harness/provider.json'
const effectHarnessRoot = '/Users/sayori/Desktop/yume-infra/effect-harness'
export const effectHarnessVerificationId = 'provider:effect-harness:create-contract'
export const effectHarnessManagedBlockSurfaceId = 'provider-managed-block:effect-harness:AGENTS.md#effect-harness'

const effectHarnessProviderProfile = {
  provider: {
    id: effectHarnessProviderId,
    contractVersion: effectHarnessContractVersion,
    providerVersion: legacyInlineEffectHarnessProviderVersion,
    defaultProfile: effectHarnessProfile,
  },
  profiles: {
    [effectHarnessProfile]: {
      options: {
        runtime: 'codex',
        effect: 'v4',
        typecheck: 'tsgo',
        languageService: true,
        floatingEffect: 'error',
        packageScopes: ['effect', '@effect/*', '@typescript/native-preview'],
      },
      officialSource: {
        manifest: 'repos/effect.subtree.json',
        llmDocument: 'repos/effect/LLMS.md',
        sourcePrefix: 'repos/effect',
      },
      source: {
        repository: 'https://github.com/Effect-TS/effect-smol.git',
        branch: 'main',
        split: '3475ee6c2bda6b05c6d7a12ce30c8bb840b5b1a6',
      },
      packageBaseline: {
        'effect': '4.0.0-beta.90',
        '@effect/platform-node': '4.0.0-beta.90',
        '@effect/vitest': '4.0.0-beta.90',
        '@effect/tsgo': '0.14.6',
        '@effect/language-service': '0.86.2',
        '@typescript/native-preview': '7.0.0-dev.20260624.1',
      },
      contributions: {
        packageJson: {
          dependencies: {
            'effect': '4.0.0-beta.90',
            '@effect/platform-node': '4.0.0-beta.90',
          },
          devDependencies: {
            '@effect/vitest': '4.0.0-beta.90',
            '@effect/tsgo': '0.14.6',
            '@effect/language-service': '0.86.2',
            '@typescript/native-preview': '7.0.0-dev.20260624.1',
          },
        },
        tsconfig: {
          compilerOptions: {
            plugins: [{
              name: '@effect/language-service',
              options: {
                diagnosticSeverity: {
                  floatingEffect: 'error',
                },
              },
            }],
          },
        },
        agentsBlock: {
          file: 'AGENTS.md',
          startMarker: '<!-- effect-harness:start -->',
          endMarker: '<!-- effect-harness:end -->',
          source: 'harness/runtime/codex/AGENTS.fragment.md',
        },
        codexAssets: {
          sourceRoot: 'harness/runtime/codex',
          skills: [
            {
              id: 'effect-code',
              source: 'skills/effect-code/SKILL.md',
              target: '.codex/skills/effect-code/SKILL.md',
            },
            {
              id: 'effect-feedback',
              source: 'skills/effect-feedback/SKILL.md',
              target: '.codex/skills/effect-feedback/SKILL.md',
            },
          ],
          skillAgents: [
            {
              id: 'effect-code-openai',
              source: 'skills/effect-code/agents/openai.yaml',
              target: '.codex/skills/effect-code/agents/openai.yaml',
            },
            {
              id: 'effect-feedback-openai',
              source: 'skills/effect-feedback/agents/openai.yaml',
              target: '.codex/skills/effect-feedback/agents/openai.yaml',
            },
          ],
          agents: [
            {
              id: 'effect-worker',
              source: 'agents/effect-worker.md',
              target: '.codex/agents/effect-worker.md',
            },
          ],
          feedbackDirectory: '.codex/effect-feedback',
        },
      },
    },
  },
} as const

const effectHarnessProfileContract = effectHarnessProviderProfile.profiles[effectHarnessProfile]
const effectHarnessAgentsStartMarker = effectHarnessProfileContract.contributions.agentsBlock.startMarker
const effectHarnessAgentsEndMarker = effectHarnessProfileContract.contributions.agentsBlock.endMarker
const effectHarnessTypecheckCommand = 'tsgo --noEmit --project tsconfig.json'

export const effectHarnessSourceEntryEditorPolicy = {
  targetSurface: 'provider-repo-source-entry',
  preludeTargetBehavior: 'do-not-materialize-source-entry-editor-settings',
  vscode: {
    defaultAutoImportExclude: {
      'typescript.preferences.autoImportFileExcludePatterns': ['repos/**'],
      'javascript.preferences.autoImportFileExcludePatterns': ['repos/**'],
    },
    recommendedExplicitExclude: {
      'files.watcherExclude': { 'repos/**': true },
      'search.exclude': { 'repos/**': true },
    },
    userPreferenceExclude: {
      'files.exclude': { 'repos/**': true },
    },
  },
  zed: {
    defaultAutoImportExcludePatterns: ['repos/**'],
    recommendedExplicitSearchAndWatchExcludes: ['repos/**'],
    hideFilesExclude: 'user-preference',
  },
} as const satisfies JsonValue

export const effectHarnessTsgoPlugin = effectHarnessProfileContract
  .contributions
  .tsconfig
  .compilerOptions
  .plugins satisfies JsonValue

function jsonRecord(value: unknown): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>
}

function effectHarnessArtifact(discovery: EffectHarnessProviderDiscovery): ProviderArtifactRecord {
  return {
    id: discovery.provider.id,
    version: discovery.provider.providerVersion,
    artifactRoot: discovery.artifactRoot,
    providerProfilePath: discovery.providerProfilePath,
    providerProfileRelativePath: discovery.providerProfileRelativePath,
    packageLocator: jsonRecord(discovery.packageLocator),
    artifactOnlyReferences: jsonRecord(discovery.artifactOnlyReferences),
    sourceIdentities: jsonRecord(discovery.sourceIdentities),
  } satisfies ProviderArtifactRecord
}

function effectHarnessRuntime(discovery: EffectHarnessProviderDiscovery) {
  return {
    commands: {
      discover: discovery.packageLocator.discoveryCommand,
    },
    routes: {
      providerProfile: discovery.providerProfileRelativePath,
    },
    files: [],
    discovery: discovery.discovery,
    deliveryModes: discovery.deliveryModes,
    targetManagedSurfaces: discovery.targetManagedSurfaces,
    internalHarnessSurfaces: discovery.internalHarnessSurfaces,
  } as const satisfies LifecycleProviderRecord['runtime']
}

export function effectHarnessResolvedProvider(discovery: EffectHarnessProviderDiscovery, packageScopes: string | readonly string[]): ResolvedProvider {
  return {
    id: discovery.provider.id,
    contractVersion: discovery.provider.contractVersion,
    artifactVersion: discovery.provider.providerVersion,
    packageScopes: typeof packageScopes === 'string' ? [packageScopes] : [...packageScopes],
  }
}

function effectHarnessTargetCommands() {
  const builtCliPath = path.join(effectHarnessRoot, 'dist/bin/effect-harness.js')
  const cliPath = fs.existsSync(builtCliPath)
    ? builtCliPath
    : path.join(effectHarnessRoot, 'bin/effect-harness.ts')

  return {
    status: `node "${cliPath}" status`,
    verify: `node "${cliPath}" verify --target .`,
    init: `node "${cliPath}" init --target . --harness "${effectHarnessRoot}"`,
  } as const
}

export function hasEffectHarnessProvider(graph: ResolvedGraph) {
  return graph.providers.some(provider => provider.id === effectHarnessProviderProfile.provider.id)
}

function effectHarnessProjectedContext(graph: ResolvedGraph): ProviderProjectedContext {
  return {
    topology: graph.topology,
    packageScopes: graph.providers.find(provider => provider.id === effectHarnessProviderProfile.provider.id)?.packageScopes ?? [],
    rootCapabilities: graph.rootCapabilities,
    packageCapabilities: graph.packageCapabilities,
  }
}

function existingFile(candidates: readonly string[]) {
  return candidates.find(candidate => fs.existsSync(candidate))
}

function workspaceInstalledPath(targetPath: string) {
  return existingFile([
    path.resolve(targetPath),
    path.resolve('..', targetPath),
    path.resolve('../..', targetPath),
  ])
}

function runtimeAssetText(sourceRelativePath: string, targetPath: string) {
  const providerSourcePath = path.join(
    effectHarnessRoot,
    effectHarnessProfileContract.contributions.codexAssets.sourceRoot,
    sourceRelativePath,
  )
  const sourcePath = fs.existsSync(providerSourcePath)
    ? providerSourcePath
    : workspaceInstalledPath(targetPath)

  if (sourcePath === undefined) {
    throw new Error(`Missing effect-harness runtime asset ${sourceRelativePath}; provider profile must expose ${targetPath}`)
  }

  return fs.readFileSync(sourcePath, 'utf8')
    .replaceAll('__EFFECT_HARNESS_ROOT__', effectHarnessRoot)
}

function currentInstalledManagedBlock() {
  const agentsPath = workspaceInstalledPath(effectHarnessProfileContract.contributions.agentsBlock.file)
  if (agentsPath === undefined) {
    return undefined
  }

  const content = fs.readFileSync(agentsPath, 'utf8')
  const start = content.indexOf(effectHarnessAgentsStartMarker)
  const end = content.indexOf(effectHarnessAgentsEndMarker)
  if (start < 0 || end < start) {
    return undefined
  }

  return `${content.slice(start, end + effectHarnessAgentsEndMarker.length).trim()}\n`
}

function agentsFragmentText() {
  const sourcePath = path.join(effectHarnessRoot, effectHarnessProfileContract.contributions.agentsBlock.source)
  if (fs.existsSync(sourcePath)) {
    return fs.readFileSync(sourcePath, 'utf8')
      .replaceAll('__EFFECT_HARNESS_ROOT__', effectHarnessRoot)
      .trim()
  }

  const installedBlock = currentInstalledManagedBlock()
  if (installedBlock !== undefined) {
    return installedBlock
      .replace(effectHarnessAgentsStartMarker, '')
      .replace(effectHarnessAgentsEndMarker, '')
      .trim()
  }

  throw new Error(`Missing effect-harness AGENTS fragment ${effectHarnessProfileContract.contributions.agentsBlock.source}`)
}

function managedAgentsBlock() {
  const fragment = agentsFragmentText()
  return `${effectHarnessAgentsStartMarker}\n${fragment}\n${effectHarnessAgentsEndMarker}\n`
}

function effectHarnessManagedFileArtifactDefinitions() {
  const assets = effectHarnessProfileContract.contributions.codexAssets

  return [
    ...assets.skills,
    ...assets.skillAgents,
    ...assets.agents,
  ]
}

export function effectHarnessManagedFileArtifacts() {
  return [
    ...effectHarnessManagedFileArtifactDefinitions().map(artifact => ({
      path: artifact.target,
      content: runtimeAssetText(artifact.source, artifact.target),
    })),
    {
      path: `${effectHarnessProfileContract.contributions.codexAssets.feedbackDirectory}/.gitkeep`,
      content: '',
    },
  ] as const
}

export function effectHarnessManagedBlockArtifact() {
  return {
    path: 'AGENTS.md',
    startMarker: effectHarnessAgentsStartMarker,
    endMarker: effectHarnessAgentsEndMarker,
    content: managedAgentsBlock(),
  } as const
}

export function effectHarnessManagedFileSurfaceId(filePath: string) {
  return `provider-managed-file:effect-harness:${filePath}`
}

function managedFileOperationId(filePath: string) {
  const slug = filePath.replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '')
  return `write-effect-harness-${slug}`
}

function managedBlockOperationId(filePath: string) {
  const slug = filePath.replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '')
  return `write-effect-harness-${slug}-block`
}

function packagePointerSurfaceId(pointer: string) {
  return `package-manifest:root:${pointer}`
}

function tsconfigPointerSurfaceId(pointer: string) {
  return `tsconfig:root:${pointer}`
}

export function effectHarnessPackageSurfacesForProjectedContext(projectedContext: ProviderProjectedContext) {
  return projectedContext.topology === 'workspace'
    ? effectHarnessPackageSurfaces().filter(surface => surface.pointer !== '/scripts/typecheck')
    : effectHarnessPackageSurfaces()
}

export function effectHarnessTsconfigSurfacesForProjectedContext(projectedContext: ProviderProjectedContext) {
  return projectedContext.topology === 'workspace'
    ? []
    : effectHarnessTsconfigSurfaces()
}

function lifecycleSurfaceMetadata(input: {
  readonly discovery: EffectHarnessProviderDiscovery
  readonly id: string
  readonly scope: 'entry' | 'file'
  readonly locator: string
  readonly base?: string
}) {
  return {
    id: input.id,
    owner: 'provider:effect-harness',
    lifecycle: 'managed',
    scope: input.scope,
    locator: input.locator,
    conflictPolicy: 'block',
    contractVersion: input.discovery.provider.contractVersion,
    implementationVersion: input.discovery.provider.providerVersion,
    ...(input.base === undefined ? {} : { base: input.base, snapshot: input.base }),
  } as const
}

function snapshotJsonValue(value: JsonValue) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function effectHarnessPackageSurfaces() {
  const commands = effectHarnessTargetCommands()
  const packageJson = effectHarnessProfileContract.contributions.packageJson

  return [
    {
      id: packagePointerSurfaceId('/dependencies/effect'),
      pointer: '/dependencies/effect',
      value: packageJson.dependencies.effect,
    },
    {
      id: packagePointerSurfaceId('/dependencies/@effect~1platform-node'),
      pointer: '/dependencies/@effect~1platform-node',
      value: packageJson.dependencies['@effect/platform-node'],
    },
    {
      id: packagePointerSurfaceId('/devDependencies/@effect~1vitest'),
      pointer: '/devDependencies/@effect~1vitest',
      value: packageJson.devDependencies['@effect/vitest'],
    },
    {
      id: packagePointerSurfaceId('/devDependencies/@effect~1tsgo'),
      pointer: '/devDependencies/@effect~1tsgo',
      value: packageJson.devDependencies['@effect/tsgo'],
    },
    {
      id: packagePointerSurfaceId('/devDependencies/@effect~1language-service'),
      pointer: '/devDependencies/@effect~1language-service',
      value: packageJson.devDependencies['@effect/language-service'],
    },
    {
      id: packagePointerSurfaceId('/devDependencies/@typescript~1native-preview'),
      pointer: '/devDependencies/@typescript~1native-preview',
      value: packageJson.devDependencies['@typescript/native-preview'],
    },
    {
      id: packagePointerSurfaceId('/scripts/effect:status'),
      pointer: '/scripts/effect:status',
      value: commands.status,
    },
    {
      id: packagePointerSurfaceId('/scripts/effect:verify'),
      pointer: '/scripts/effect:verify',
      value: commands.verify,
    },
    {
      id: packagePointerSurfaceId('/scripts/typecheck'),
      pointer: '/scripts/typecheck',
      value: effectHarnessTypecheckCommand,
    },
  ] as const satisfies readonly { readonly id: string, readonly pointer: string, readonly value: JsonValue }[]
}

function effectHarnessTsconfigSurfaces() {
  return [
    {
      id: tsconfigPointerSurfaceId('/compilerOptions/plugins'),
      pointer: '/compilerOptions/plugins',
      value: effectHarnessTsgoPlugin,
    },
  ] as const satisfies readonly { readonly id: string, readonly pointer: string, readonly value: JsonValue }[]
}

function effectHarnessLifecycleSurfacesForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext): readonly LifecycleSurfaceRecord[] {
  return [
    ...effectHarnessPackageSurfacesForProjectedContext(projectedContext).map(surface =>
      structuredPointerSurface({
        discovery,
        surface,
        path: 'package.json',
        locator: `package.json#${surface.pointer}`,
        operationId: 'write-package-json',
      })),
    ...effectHarnessTsconfigSurfacesForProjectedContext(projectedContext).map(surface =>
      structuredPointerSurface({
        discovery,
        surface,
        path: 'tsconfig.json',
        locator: `tsconfig.json#${surface.pointer}`,
        operationId: 'write-tsconfig',
      })),
    ...effectHarnessManagedFileArtifacts().map(artifact =>
      ownedFileSurface({
        discovery,
        id: effectHarnessManagedFileSurfaceId(artifact.path),
        path: artifact.path,
        base: artifact.content,
        operationId: managedFileOperationId(artifact.path),
      })),
    managedBlockSurface({
      discovery,
      id: effectHarnessManagedBlockSurfaceId,
      artifact: effectHarnessManagedBlockArtifact(),
      operationId: managedBlockOperationId('AGENTS.md'),
    }),
  ]
}

function structuredPointerSurface(input: {
  readonly discovery: EffectHarnessProviderDiscovery
  readonly surface: { readonly id: string, readonly pointer: string, readonly value: JsonValue }
  readonly path: string
  readonly locator: string
  readonly operationId: string
}): LifecycleSurfaceRecord {
  const snapshot = snapshotJsonValue(input.surface.value)

  return {
    ...lifecycleSurfaceMetadata({
      discovery: input.discovery,
      id: input.surface.id,
      scope: 'entry',
      locator: input.locator,
      base: snapshot,
    }),
    authority: 'bounded',
    kind: 'structuredPointer',
    path: input.path,
    pointer: input.surface.pointer,
    base: snapshot,
    snapshot,
    operationId: input.operationId,
  }
}

function ownedFileSurface(input: {
  readonly discovery: EffectHarnessProviderDiscovery
  readonly id: string
  readonly path: string
  readonly base: string
  readonly operationId: string
}): LifecycleSurfaceRecord {
  return {
    ...lifecycleSurfaceMetadata({
      discovery: input.discovery,
      id: input.id,
      scope: 'file',
      locator: input.path,
      base: input.base,
    }),
    authority: 'owner',
    kind: 'ownedFile',
    path: input.path,
    operationId: input.operationId,
  }
}

function managedBlockSurface(input: {
  readonly discovery: EffectHarnessProviderDiscovery
  readonly id: string
  readonly artifact: ReturnType<typeof effectHarnessManagedBlockArtifact>
  readonly operationId: string
}): LifecycleSurfaceRecord {
  return {
    ...lifecycleSurfaceMetadata({
      discovery: input.discovery,
      id: input.id,
      scope: 'entry',
      locator: `${input.artifact.path}#effect-harness`,
      base: input.artifact.content,
    }),
    authority: 'bounded',
    kind: 'managedBlock',
    path: input.artifact.path,
    startMarker: input.artifact.startMarker,
    endMarker: input.artifact.endMarker,
    base: input.artifact.content,
    snapshot: input.artifact.content,
    operationId: input.operationId,
  }
}

export function effectHarnessLifecycleProviderRecord(discovery: EffectHarnessProviderDiscovery, graph: ResolvedGraph): LifecycleProviderRecord {
  return effectHarnessProviderRecordForProjectedContext(discovery, effectHarnessProjectedContext(graph))
}

export function effectHarnessMaintainProviderReference(record: LifecycleProviderRecord): MaintainProviderReference {
  return {
    id: record.id,
    contractVersion: record.contractVersion,
    providerVersion: record.providerVersion,
    profile: record.profile,
    recordPath: effectHarnessProviderPath,
  }
}

export function effectHarnessProviderRecordForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext): LifecycleProviderRecord {
  const surfaces = effectHarnessLifecycleSurfacesForProjectedContext(discovery, projectedContext)
  const artifact = effectHarnessArtifact(discovery)

  return {
    schemaVersion: 1,
    id: discovery.provider.id,
    contractVersion: discovery.provider.contractVersion,
    providerVersion: discovery.provider.providerVersion,
    profile: discovery.selectedProfile,
    artifact,
    projectedContext,
    options: {
      runtime: effectHarnessProfileContract.options.runtime,
      effect: {
        major: 4,
        packageBaseline: effectHarnessProfileContract.packageBaseline,
      },
      languageService: {
        enabled: effectHarnessProfileContract.options.languageService,
        floatingEffect: effectHarnessProfileContract.options.floatingEffect,
      },
      packageScopes: projectedContext.packageScopes,
    },
    runtime: effectHarnessRuntime(discovery),
    surfaces,
    verificationRecordId: effectHarnessVerificationId,
  }
}

export function effectHarnessVerificationRecord(): VerificationRecord {
  return {
    id: effectHarnessVerificationId,
    status: 'passed',
    checkedPaths: ['package.json', effectHarnessProviderPath],
  }
}

function providerJsonValueForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(effectHarnessProviderRecordForProjectedContext(discovery, projectedContext))) as Record<string, JsonValue>
}

function providerJsonValue(discovery: EffectHarnessProviderDiscovery, graph: ResolvedGraph): Record<string, JsonValue> {
  return providerJsonValueForProjectedContext(discovery, effectHarnessProjectedContext(graph))
}

export function effectHarnessContributions(discovery: EffectHarnessProviderDiscovery, graph: ResolvedGraph): readonly CapabilityContribution[] {
  const scripts: Record<string, JsonValue> = {
    'effect:status': effectHarnessTargetCommands().status,
    'effect:verify': effectHarnessTargetCommands().verify,
    ...(graph.topology === 'workspace' ? {} : { typecheck: effectHarnessTypecheckCommand }),
  }
  const packageJson = effectHarnessProfileContract.contributions.packageJson

  return [
    {
      kind: 'packageManifest',
      surfaceId: 'package-manifest:root',
      owner: 'provider:effect-harness',
      entries: {
        scripts,
        dependencies: {
          '@effect/platform-node': packageJson.dependencies['@effect/platform-node'],
          'effect': packageJson.dependencies.effect,
        },
        devDependencies: {
          '@effect/language-service': packageJson.devDependencies['@effect/language-service'],
          '@effect/tsgo': packageJson.devDependencies['@effect/tsgo'],
          '@effect/vitest': packageJson.devDependencies['@effect/vitest'],
          '@typescript/native-preview': packageJson.devDependencies['@typescript/native-preview'],
          'typescript': 'catalog:',
        },
      },
    },
    {
      kind: 'providerArtifact',
      surfaceId: 'provider:effect-harness',
      owner: 'provider:effect-harness',
      providerId: 'effect-harness',
      path: effectHarnessProviderPath,
      value: providerJsonValue(discovery, graph),
    },
    ...effectHarnessManagedFileArtifacts().map(artifact => ({
      kind: 'providerManagedFile' as const,
      surfaceId: effectHarnessManagedFileSurfaceId(artifact.path),
      operationId: managedFileOperationId(artifact.path),
      owner: 'provider:effect-harness' as const,
      providerId: 'effect-harness' as const,
      path: artifact.path,
      content: artifact.content,
    })),
    {
      kind: 'providerManagedBlock',
      surfaceId: effectHarnessManagedBlockSurfaceId,
      operationId: managedBlockOperationId('AGENTS.md'),
      owner: 'provider:effect-harness',
      providerId: 'effect-harness',
      path: effectHarnessManagedBlockArtifact().path,
      startMarker: effectHarnessManagedBlockArtifact().startMarker,
      endMarker: effectHarnessManagedBlockArtifact().endMarker,
      content: effectHarnessManagedBlockArtifact().content,
    },
  ]
}
