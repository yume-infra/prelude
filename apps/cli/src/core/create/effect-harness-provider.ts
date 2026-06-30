import type {
  CapabilityContribution,
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

export const effectHarnessContractVersion = '1'
export const effectHarnessProviderVersion = '0.1.0'
const effectHarnessProfile = 'codex-effect-v4'
const effectHarnessProviderPath = '.prelude/providers/effect-harness/provider.json'
const effectHarnessRoot = '/Users/sayori/Desktop/yume-infra/effect-harness'
export const effectHarnessVerificationId = 'provider:effect-harness:create-contract'
export const effectHarnessManagedBlockSurfaceId = 'provider-managed-block:effect-harness:AGENTS.md#effect-harness'
const effectHarnessRuntimeRoot = path.join(effectHarnessRoot, 'harness/runtime/codex')
const effectHarnessAgentsStartMarker = '<!-- effect-harness:start -->'
const effectHarnessAgentsEndMarker = '<!-- effect-harness:end -->'
export const effectHarnessTsgoPlugin = [{
  name: '@effect/language-service',
  options: {
    diagnosticSeverity: {
      floatingEffect: 'error',
    },
  },
}] as const satisfies JsonValue

export const effectHarnessArtifact = {
  id: 'effect-harness',
  version: effectHarnessProviderVersion,
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
} as const satisfies ProviderArtifactRecord

export function effectHarnessResolvedProvider(packageScopes: string | readonly string[]): ResolvedProvider {
  return {
    id: 'effect-harness',
    contractVersion: effectHarnessContractVersion,
    artifactVersion: effectHarnessProviderVersion,
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

function effectHarnessRoutes() {
  return {
    harness: path.join(effectHarnessRoot, 'HARNESS.md'),
    agentContract: path.join(effectHarnessRoot, 'harness/index.md'),
    targetContract: path.join(effectHarnessRoot, 'harness/target-agent-contract.md'),
    officialGuide: path.join(effectHarnessRoot, 'repos/effect/LLMS.md'),
  } as const
}

export function hasEffectHarnessProvider(graph: ResolvedGraph) {
  return graph.providers.some(provider => provider.id === 'effect-harness')
}

function effectHarnessProjectedContext(graph: ResolvedGraph): ProviderProjectedContext {
  return {
    topology: graph.topology,
    packageScopes: graph.providers.find(provider => provider.id === 'effect-harness')?.packageScopes ?? [],
    rootCapabilities: graph.rootCapabilities,
    packageCapabilities: graph.packageCapabilities,
  }
}

function runtimeText(relativePath: string) {
  return fs.readFileSync(path.join(effectHarnessRuntimeRoot, relativePath), 'utf8')
    .replaceAll('__EFFECT_HARNESS_ROOT__', effectHarnessRoot)
}

function runtimeFilesUnder(directory: 'skills' | 'agents') {
  const sourceRoot = path.join(effectHarnessRuntimeRoot, directory)
  const targetRoot = `.codex/${directory}`
  const files: Array<{ readonly path: string, readonly content: string }> = []

  function visit(absoluteDirectory: string, relativeDirectory: string): void {
    for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const relativePath = relativeDirectory === '' ? entry.name : `${relativeDirectory}/${entry.name}`
      const absolutePath = path.join(absoluteDirectory, entry.name)

      if (entry.isDirectory()) {
        visit(absolutePath, relativePath)
        continue
      }

      files.push({
        path: `${targetRoot}/${relativePath}`,
        content: fs.readFileSync(absolutePath, 'utf8').replaceAll('__EFFECT_HARNESS_ROOT__', effectHarnessRoot),
      })
    }
  }

  visit(sourceRoot, '')
  return files
}

function managedAgentsBlock() {
  const fragment = runtimeText('AGENTS.fragment.md').trim()
  return `${effectHarnessAgentsStartMarker}\n${fragment}\n${effectHarnessAgentsEndMarker}\n`
}

export function effectHarnessManagedFileArtifacts() {
  return [
    ...runtimeFilesUnder('skills'),
    ...runtimeFilesUnder('agents'),
    {
      path: '.codex/effect-feedback/.gitkeep',
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

export function effectHarnessProviderSurfaceIdsForProjectedContext(projectedContext: ProviderProjectedContext): readonly string[] {
  return [
    ...effectHarnessPackageSurfacesForProjectedContext(projectedContext).map(surface => surface.id),
    ...effectHarnessTsconfigSurfacesForProjectedContext(projectedContext).map(surface => surface.id),
    ...effectHarnessManagedFileArtifacts().map(artifact => effectHarnessManagedFileSurfaceId(artifact.path)),
    effectHarnessManagedBlockSurfaceId,
  ]
}

function lifecycleSurfaceMetadata(input: {
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
    contractVersion: effectHarnessContractVersion,
    implementationVersion: effectHarnessProviderVersion,
    ...(input.base === undefined ? {} : { base: input.base, snapshot: input.base }),
  } as const
}

function snapshotJsonValue(value: JsonValue) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function effectHarnessPackageSurfaces() {
  const commands = effectHarnessTargetCommands()

  return [
    {
      id: packagePointerSurfaceId('/dependencies/effect'),
      pointer: '/dependencies/effect',
      value: effectHarnessArtifact.packageBaseline.effect,
    },
    {
      id: packagePointerSurfaceId('/dependencies/@effect~1platform-node'),
      pointer: '/dependencies/@effect~1platform-node',
      value: effectHarnessArtifact.packageBaseline['@effect/platform-node'],
    },
    {
      id: packagePointerSurfaceId('/devDependencies/@effect~1vitest'),
      pointer: '/devDependencies/@effect~1vitest',
      value: effectHarnessArtifact.packageBaseline['@effect/vitest'],
    },
    {
      id: packagePointerSurfaceId('/devDependencies/@effect~1tsgo'),
      pointer: '/devDependencies/@effect~1tsgo',
      value: effectHarnessArtifact.packageBaseline['@effect/tsgo'],
    },
    {
      id: packagePointerSurfaceId('/devDependencies/@effect~1language-service'),
      pointer: '/devDependencies/@effect~1language-service',
      value: effectHarnessArtifact.packageBaseline['@effect/language-service'],
    },
    {
      id: packagePointerSurfaceId('/devDependencies/@typescript~1native-preview'),
      pointer: '/devDependencies/@typescript~1native-preview',
      value: effectHarnessArtifact.packageBaseline['@typescript/native-preview'],
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
      value: 'tsgo --noEmit --project tsconfig.json',
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

function effectHarnessLifecycleSurfacesForProjectedContext(projectedContext: ProviderProjectedContext): readonly LifecycleSurfaceRecord[] {
  return [
    ...effectHarnessPackageSurfacesForProjectedContext(projectedContext).map(surface =>
      structuredPointerSurface({
        surface,
        path: 'package.json',
        locator: `package.json#${surface.pointer}`,
        operationId: 'write-package-json',
      })),
    ...effectHarnessTsconfigSurfacesForProjectedContext(projectedContext).map(surface =>
      structuredPointerSurface({
        surface,
        path: 'tsconfig.json',
        locator: `tsconfig.json#${surface.pointer}`,
        operationId: 'write-tsconfig',
      })),
    ...effectHarnessManagedFileArtifacts().map(artifact =>
      ownedFileSurface({
        id: effectHarnessManagedFileSurfaceId(artifact.path),
        path: artifact.path,
        base: artifact.content,
        operationId: managedFileOperationId(artifact.path),
      })),
    managedBlockSurface({
      id: effectHarnessManagedBlockSurfaceId,
      artifact: effectHarnessManagedBlockArtifact(),
      operationId: managedBlockOperationId('AGENTS.md'),
    }),
  ]
}

function structuredPointerSurface(input: {
  readonly surface: { readonly id: string, readonly pointer: string, readonly value: JsonValue }
  readonly path: string
  readonly locator: string
  readonly operationId: string
}): LifecycleSurfaceRecord {
  const snapshot = snapshotJsonValue(input.surface.value)

  return {
    ...lifecycleSurfaceMetadata({
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
  readonly id: string
  readonly path: string
  readonly base: string
  readonly operationId: string
}): LifecycleSurfaceRecord {
  return {
    ...lifecycleSurfaceMetadata({
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
  readonly id: string
  readonly artifact: ReturnType<typeof effectHarnessManagedBlockArtifact>
  readonly operationId: string
}): LifecycleSurfaceRecord {
  return {
    ...lifecycleSurfaceMetadata({
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

export function effectHarnessLifecycleProviderRecord(graph: ResolvedGraph): LifecycleProviderRecord {
  return effectHarnessProviderRecordForProjectedContext(effectHarnessProjectedContext(graph))
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

export function effectHarnessProviderRecordForProjectedContext(projectedContext: ProviderProjectedContext): LifecycleProviderRecord {
  const surfaces = effectHarnessLifecycleSurfacesForProjectedContext(projectedContext)

  return {
    schemaVersion: 1,
    id: 'effect-harness',
    contractVersion: effectHarnessContractVersion,
    providerVersion: effectHarnessProviderVersion,
    profile: effectHarnessProfile,
    artifact: effectHarnessArtifact,
    projectedContext,
    options: {
      runtime: 'codex',
      effect: {
        major: 4,
        packageBaseline: effectHarnessArtifact.packageBaseline,
      },
      languageService: {
        enabled: true,
        floatingEffect: 'error',
      },
      packageScopes: projectedContext.packageScopes,
    },
    runtime: {
      commands: effectHarnessTargetCommands(),
      routes: effectHarnessRoutes(),
      files: [
        ...effectHarnessManagedFileArtifacts().map(artifact => artifact.path),
        effectHarnessManagedBlockArtifact().path,
      ],
    },
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

function providerJsonValueForProjectedContext(projectedContext: ProviderProjectedContext): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(effectHarnessProviderRecordForProjectedContext(projectedContext))) as Record<string, JsonValue>
}

function providerJsonValue(graph: ResolvedGraph): Record<string, JsonValue> {
  return providerJsonValueForProjectedContext(effectHarnessProjectedContext(graph))
}

export function effectHarnessContributions(graph: ResolvedGraph): readonly CapabilityContribution[] {
  const scripts: Record<string, JsonValue> = {
    'effect:status': effectHarnessTargetCommands().status,
    'effect:verify': effectHarnessTargetCommands().verify,
    ...(graph.topology === 'workspace' ? {} : { typecheck: 'tsgo --noEmit --project tsconfig.json' }),
  }

  return [
    {
      kind: 'packageManifest',
      surfaceId: 'package-manifest:root',
      owner: 'provider:effect-harness',
      entries: {
        scripts,
        dependencies: {
          '@effect/platform-node': effectHarnessArtifact.packageBaseline['@effect/platform-node'],
          'effect': effectHarnessArtifact.packageBaseline.effect,
        },
        devDependencies: {
          '@effect/language-service': effectHarnessArtifact.packageBaseline['@effect/language-service'],
          '@effect/tsgo': effectHarnessArtifact.packageBaseline['@effect/tsgo'],
          '@effect/vitest': effectHarnessArtifact.packageBaseline['@effect/vitest'],
          '@typescript/native-preview': effectHarnessArtifact.packageBaseline['@typescript/native-preview'],
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
      value: providerJsonValue(graph),
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
