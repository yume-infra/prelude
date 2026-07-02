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
const effectHarnessManagedBlockSurfaceId = 'provider-managed-block:effect-harness:AGENTS.md#effect-harness'

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

function jsonRecord(value: unknown): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>
}

function isJsonRecord(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requiredJsonRecord(value: JsonValue | undefined, source: string): Record<string, JsonValue> {
  if (!isJsonRecord(value)) {
    throw new Error(`Invalid effect-harness provider discovery: expected ${source} JSON object`)
  }

  return value
}

function requiredString(value: JsonValue | undefined, source: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid effect-harness provider discovery: expected ${source} string`)
  }

  return value
}

function optionalString(value: JsonValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function jsonPointerSegment(value: string) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function targetManagedContributions(discovery: EffectHarnessProviderDiscovery) {
  return requiredJsonRecord(discovery.targetManagedSurfaces.contributions, 'targetManagedSurfaces.contributions')
}

function targetManagedContribution(discovery: EffectHarnessProviderDiscovery, key: string) {
  return requiredJsonRecord(targetManagedContributions(discovery)[key], `targetManagedSurfaces.contributions.${key}`)
}

function effectHarnessPackageJsonContribution(discovery: EffectHarnessProviderDiscovery) {
  return targetManagedContribution(discovery, 'packageJson')
}

function effectHarnessTsconfigContribution(discovery: EffectHarnessProviderDiscovery) {
  return targetManagedContribution(discovery, 'tsconfig')
}

function effectHarnessPolicyContributions(discovery: EffectHarnessProviderDiscovery) {
  const contributions = targetManagedContributions(discovery)

  return {
    editorPolicy: requiredJsonRecord(contributions.editorPolicy, 'targetManagedSurfaces.contributions.editorPolicy'),
    lintGuardrails: requiredJsonRecord(contributions.lintGuardrails, 'targetManagedSurfaces.contributions.lintGuardrails'),
    testPolicy: requiredJsonRecord(contributions.testPolicy, 'targetManagedSurfaces.contributions.testPolicy'),
    verificationPolicy: requiredJsonRecord(contributions.verificationPolicy, 'targetManagedSurfaces.contributions.verificationPolicy'),
  }
}

function targetManagedFilesContribution(discovery: EffectHarnessProviderDiscovery, key: 'documentationBundle' | 'snippets') {
  return requiredJsonRecord(discovery.targetManagedSurfaces[key], `targetManagedSurfaces.${key}`)
}

function effectHarnessPackageDependencyGroups(discovery: EffectHarnessProviderDiscovery) {
  return requiredJsonRecord(effectHarnessPackageJsonContribution(discovery).dependencyGroups, 'targetManagedSurfaces.contributions.packageJson.dependencyGroups')
}

function effectHarnessPackageScripts(discovery: EffectHarnessProviderDiscovery) {
  return requiredJsonRecord(effectHarnessPackageJsonContribution(discovery).scripts, 'targetManagedSurfaces.contributions.packageJson.scripts')
}

function effectHarnessPackageBaseline(discovery: EffectHarnessProviderDiscovery): Record<string, JsonValue> {
  const packageBaseline: Record<string, JsonValue> = {}

  for (const [groupName, groupValue] of Object.entries(effectHarnessPackageDependencyGroups(discovery))) {
    const group = requiredJsonRecord(groupValue, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}`)
    const packages = requiredJsonRecord(group.packages, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.packages`)

    for (const [packageName, version] of Object.entries(packages)) {
      packageBaseline[packageName] = requiredString(version, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.packages.${packageName}`)
    }
  }

  return packageBaseline
}

export function effectHarnessTypecheckCommandForDiscovery(discovery: EffectHarnessProviderDiscovery) {
  const scripts = effectHarnessPackageScripts(discovery)
  const typecheck = requiredJsonRecord(scripts.typecheck, 'targetManagedSurfaces.contributions.packageJson.scripts.typecheck')

  return requiredString(typecheck.defaultCommand, 'targetManagedSurfaces.contributions.packageJson.scripts.typecheck.defaultCommand')
}

function effectHarnessLanguageServiceFloatingEffect(discovery: EffectHarnessProviderDiscovery) {
  const [plugin] = effectHarnessTsgoPluginForDiscovery(discovery)
  const pluginRecord = requiredJsonRecord(plugin, 'targetManagedSurfaces.contributions.tsconfig.compilerOptions.plugins[0]')
  const diagnosticSeverity = requiredJsonRecord(pluginRecord.diagnosticSeverity, 'targetManagedSurfaces.contributions.tsconfig.compilerOptions.plugins[0].diagnosticSeverity')

  return optionalString(diagnosticSeverity.floatingEffect) ?? 'error'
}

export function effectHarnessTsgoPluginForDiscovery(discovery: EffectHarnessProviderDiscovery): readonly JsonValue[] {
  const tsconfig = effectHarnessTsconfigContribution(discovery)
  const compilerOptions = requiredJsonRecord(tsconfig.compilerOptions, 'targetManagedSurfaces.contributions.tsconfig.compilerOptions')
  const plugins = compilerOptions.plugins

  if (!Array.isArray(plugins)) {
    throw new TypeError('Invalid effect-harness provider discovery: expected targetManagedSurfaces.contributions.tsconfig.compilerOptions.plugins array')
  }

  return plugins
}

export function effectHarnessProviderVerificationCommands(discovery: EffectHarnessProviderDiscovery): readonly string[] {
  const { verificationPolicy } = effectHarnessPolicyContributions(discovery)
  const localCommands = requiredJsonRecord(verificationPolicy.localCommands, 'targetManagedSurfaces.contributions.verificationPolicy.localCommands')
  const diagnostics = localCommands.diagnostics

  if (!Array.isArray(diagnostics)) {
    return ['pnpm typecheck']
  }

  return diagnostics.map((command, index) =>
    requiredString(command, `targetManagedSurfaces.contributions.verificationPolicy.localCommands.diagnostics[${index}]`))
}

export function effectHarnessProviderLintCommand(discovery: EffectHarnessProviderDiscovery) {
  const { lintGuardrails } = effectHarnessPolicyContributions(discovery)

  return requiredString(lintGuardrails.command, 'targetManagedSurfaces.contributions.lintGuardrails.command')
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

function discoveryManagedFileContent(discovery: EffectHarnessProviderDiscovery, file: Record<string, JsonValue>, source: string) {
  const inlineContent = optionalString(file.content)
  if (inlineContent !== undefined) {
    return inlineContent
  }

  const sourcePath = requiredString(file.sourcePath, `${source}.sourcePath`)

  return fs.readFileSync(path.join(discovery.artifactRoot, sourcePath), 'utf8')
}

function effectHarnessManagedFilesContribution(discovery: EffectHarnessProviderDiscovery, key: 'documentationBundle' | 'snippets') {
  const contribution = targetManagedFilesContribution(discovery, key)
  const targetBasePath = requiredString(contribution.targetBasePath, `targetManagedSurfaces.${key}.targetBasePath`)
  const files = contribution.files

  if (!Array.isArray(files)) {
    throw new TypeError(`Invalid effect-harness provider discovery: expected targetManagedSurfaces.${key}.files array`)
  }

  return files.map((fileValue, index) => {
    const source = `targetManagedSurfaces.${key}.files[${index}]`
    const file = requiredJsonRecord(fileValue, source)
    const targetPath = requiredString(file.targetPath, `${source}.targetPath`)
    const pathInTarget = path.posix.join(targetBasePath, targetPath)

    return {
      path: pathInTarget,
      content: discoveryManagedFileContent(discovery, file, source),
    }
  })
}

function effectHarnessDiscoveryManagedFileArtifacts(discovery: EffectHarnessProviderDiscovery) {
  return [
    ...effectHarnessManagedFilesContribution(discovery, 'documentationBundle'),
    ...effectHarnessManagedFilesContribution(discovery, 'snippets'),
  ]
}

function effectHarnessManagedFileArtifacts() {
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

function effectHarnessManagedBlockArtifact() {
  return {
    path: 'AGENTS.md',
    startMarker: effectHarnessAgentsStartMarker,
    endMarker: effectHarnessAgentsEndMarker,
    content: managedAgentsBlock(),
  } as const
}

function effectHarnessManagedFileSurfaceId(filePath: string) {
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

function effectHarnessPackageSurfacesForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext) {
  return projectedContext.topology === 'workspace'
    ? effectHarnessPackageSurfaces(discovery).filter(surface => surface.pointer !== '/scripts/typecheck')
    : effectHarnessPackageSurfaces(discovery)
}

function effectHarnessTsconfigSurfacesForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext) {
  return projectedContext.topology === 'workspace'
    ? []
    : effectHarnessTsconfigSurfaces(discovery)
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

function effectHarnessPackageSurfaces(discovery: EffectHarnessProviderDiscovery) {
  const surfaces: { readonly id: string, readonly pointer: string, readonly value: JsonValue }[] = []

  for (const [groupName, groupValue] of Object.entries(effectHarnessPackageDependencyGroups(discovery))) {
    const group = requiredJsonRecord(groupValue, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}`)
    const field = requiredString(group.field, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.field`)
    const packages = requiredJsonRecord(group.packages, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.packages`)

    if (field !== 'dependencies' && field !== 'devDependencies') {
      throw new Error(`Invalid effect-harness provider discovery: unsupported packageJson dependency field ${field}`)
    }

    for (const [packageName, version] of Object.entries(packages)) {
      const pointer = `/${field}/${jsonPointerSegment(packageName)}`
      surfaces.push({
        id: packagePointerSurfaceId(pointer),
        pointer,
        value: requiredString(version, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.packages.${packageName}`),
      })
    }
  }

  for (const [scriptName, scriptValue] of Object.entries(effectHarnessPackageScripts(discovery))) {
    const script = requiredJsonRecord(scriptValue, `targetManagedSurfaces.contributions.packageJson.scripts.${scriptName}`)
    const pointer = `/scripts/${jsonPointerSegment(scriptName)}`
    surfaces.push({
      id: packagePointerSurfaceId(pointer),
      pointer,
      value: requiredString(script.defaultCommand, `targetManagedSurfaces.contributions.packageJson.scripts.${scriptName}.defaultCommand`),
    })
  }

  return surfaces
}

function effectHarnessTsconfigSurfaces(discovery: EffectHarnessProviderDiscovery) {
  return [
    {
      id: tsconfigPointerSurfaceId('/compilerOptions/plugins'),
      pointer: '/compilerOptions/plugins',
      value: effectHarnessTsgoPluginForDiscovery(discovery),
    },
  ] as const satisfies readonly { readonly id: string, readonly pointer: string, readonly value: JsonValue }[]
}

function effectHarnessLifecycleSurfacesForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext): readonly LifecycleSurfaceRecord[] {
  return [
    ...effectHarnessPackageSurfacesForProjectedContext(discovery, projectedContext).map(surface =>
      structuredPointerSurface({
        discovery,
        surface,
        path: 'package.json',
        locator: `package.json#${surface.pointer}`,
        operationId: 'write-package-json',
      })),
    ...effectHarnessTsconfigSurfacesForProjectedContext(discovery, projectedContext).map(surface =>
      structuredPointerSurface({
        discovery,
        surface,
        path: 'tsconfig.json',
        locator: `tsconfig.json#${surface.pointer}`,
        operationId: 'write-tsconfig',
      })),
    ...effectHarnessDiscoveryManagedFileArtifacts(discovery).map(artifact =>
      ownedFileSurface({
        discovery,
        id: effectHarnessManagedFileSurfaceId(artifact.path),
        path: artifact.path,
        base: artifact.content,
        operationId: managedFileOperationId(artifact.path),
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
        packageBaseline: effectHarnessPackageBaseline(discovery),
      },
      languageService: {
        enabled: effectHarnessTsgoPluginForDiscovery(discovery).length > 0,
        floatingEffect: effectHarnessLanguageServiceFloatingEffect(discovery),
      },
      packageScopes: projectedContext.packageScopes,
      policies: effectHarnessPolicyContributions(discovery),
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

function packageManifestEntriesFromSurfaces(surfaces: readonly { readonly pointer: string, readonly value: JsonValue }[]) {
  const entries: Record<string, JsonValue> = {}

  for (const surface of surfaces) {
    const [, section, rawKey] = surface.pointer.split('/')
    if (section === undefined || rawKey === undefined) {
      continue
    }

    const key = rawKey.replaceAll('~1', '/').replaceAll('~0', '~')
    const sectionEntries = isJsonRecord(entries[section]) ? entries[section] : {}
    entries[section] = {
      ...sectionEntries,
      [key]: surface.value,
    }
  }

  return entries
}

export function effectHarnessContributions(discovery: EffectHarnessProviderDiscovery, graph: ResolvedGraph): readonly CapabilityContribution[] {
  const projectedContext = effectHarnessProjectedContext(graph)
  const packageEntries = packageManifestEntriesFromSurfaces(effectHarnessPackageSurfacesForProjectedContext(discovery, projectedContext))

  return [
    {
      kind: 'packageManifest',
      surfaceId: 'package-manifest:root',
      owner: 'provider:effect-harness',
      entries: packageEntries,
    },
    {
      kind: 'providerArtifact',
      surfaceId: 'provider:effect-harness',
      owner: 'provider:effect-harness',
      providerId: 'effect-harness',
      path: effectHarnessProviderPath,
      value: providerJsonValue(discovery, graph),
    },
    ...effectHarnessDiscoveryManagedFileArtifacts(discovery).map(artifact => ({
      kind: 'providerManagedFile' as const,
      surfaceId: effectHarnessManagedFileSurfaceId(artifact.path),
      operationId: managedFileOperationId(artifact.path),
      owner: 'provider:effect-harness' as const,
      providerId: 'effect-harness' as const,
      path: artifact.path,
      content: artifact.content,
    })),
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
