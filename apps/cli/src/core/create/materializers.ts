import type {
  CapabilityContribution,
  EslintRootContribution,
  FrontendEntryContribution,
  GeneratedUserFileContribution,
  KnipRootContribution,
  PackageManifestContribution,
  ProviderArtifactContribution,
  ProviderManagedBlockContribution,
  ProviderManagedFileContribution,
  ReactAppShellContribution,
  StyleSheetContribution,
  TsdownConfigContribution,
  TypeScriptConfigContribution,
  ViteConfigContribution,
  VueAppShellContribution,
  WorkspaceManifestContribution,
  WritePlan,
} from './model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'
import { materializeFrontendEntry } from './materializers/frontend-entry'
import { materializeGeneratedUserFile } from './materializers/generated-user-file'
import { materializePackageJson } from './materializers/package-manifest'
import { materializeProviderArtifact } from './materializers/provider-artifact'
import { materializeProviderManagedBlock } from './materializers/provider-managed-block'
import { materializeProviderManagedFile } from './materializers/provider-managed-file'
import { materializeReactAppShell } from './materializers/react-app-shell'
import { materializeEslintRoot, materializeKnipRoot } from './materializers/root-engineering'
import { materializeStyleSheet } from './materializers/stylesheet'
import { materializeTsdownConfig, materializeTypeScriptConfig } from './materializers/typescript-config'
import { materializeViteConfig } from './materializers/vite-config'
import { materializeVueAppShell } from './materializers/vue-app-shell'
import { materializeWorkspaceManifest } from './materializers/workspace-manifest'

function groupBySurface<T extends { readonly surfaceId: string }>(contributions: readonly T[]) {
  const surfaces = new Map<string, readonly T[]>()

  for (const contribution of contributions) {
    const existing = surfaces.get(contribution.surfaceId) ?? []
    surfaces.set(contribution.surfaceId, [...existing, contribution])
  }

  return surfaces
}

function providerManagedConflictError(input: {
  readonly surfaceId: string
  readonly target: string
}) {
  return new SchemaContractError({
    schema: input.surfaceId,
    issueCount: 1,
    message: `Conflicting provider-managed contribution for ${input.target}. Provider-managed files and blocks must have one writer.`,
  })
}

const ensureUniqueProviderManagedTargets = Effect.fn('ensureUniqueProviderManagedTargets')(
  function* (
    fileContributions: readonly ProviderManagedFileContribution[],
    blockContributions: readonly ProviderManagedBlockContribution[],
  ): Effect.fn.Return<void, SchemaContractError> {
    const surfaceIds = new Set<string>()
    const filePaths = new Set<string>()
    const blockTargets = new Set<string>()

    for (const contribution of fileContributions) {
      if (surfaceIds.has(contribution.surfaceId) || filePaths.has(contribution.path)) {
        return yield* providerManagedConflictError({
          surfaceId: contribution.surfaceId,
          target: contribution.path,
        })
      }

      surfaceIds.add(contribution.surfaceId)
      filePaths.add(contribution.path)
    }

    for (const contribution of blockContributions) {
      const blockTarget = `${contribution.path}#${contribution.startMarker}..${contribution.endMarker}`
      if (surfaceIds.has(contribution.surfaceId) || filePaths.has(contribution.path) || blockTargets.has(blockTarget)) {
        return yield* providerManagedConflictError({
          surfaceId: contribution.surfaceId,
          target: blockTarget,
        })
      }

      surfaceIds.add(contribution.surfaceId)
      blockTargets.add(blockTarget)
    }
  },
)

export const materializeWritePlan = Effect.fn('materializeWritePlan')(
  function* (contributions: readonly CapabilityContribution[]): Effect.fn.Return<WritePlan, SchemaContractError> {
    const packageManifestContributions = contributions.filter(
      (contribution): contribution is PackageManifestContribution => contribution.kind === 'packageManifest',
    )
    const workspaceManifestContributions = contributions.filter(
      (contribution): contribution is WorkspaceManifestContribution => contribution.kind === 'workspaceManifest',
    )
    const eslintRootContributions = contributions.filter(
      (contribution): contribution is EslintRootContribution => contribution.kind === 'eslintRoot',
    )
    const knipRootContributions = contributions.filter(
      (contribution): contribution is KnipRootContribution => contribution.kind === 'knipRoot',
    )
    const sourceContributions = contributions.filter(
      (contribution): contribution is GeneratedUserFileContribution => contribution.kind === 'generatedUserFile',
    )
    const frontendEntryContributions = contributions.filter(
      (contribution): contribution is FrontendEntryContribution => contribution.kind === 'frontendEntry',
    )
    const viteConfigContributions = contributions.filter(
      (contribution): contribution is ViteConfigContribution => contribution.kind === 'viteConfig',
    )
    const styleSheetContributions = contributions.filter(
      (contribution): contribution is StyleSheetContribution => contribution.kind === 'styleSheet',
    )
    const reactAppShellContributions = contributions.filter(
      (contribution): contribution is ReactAppShellContribution => contribution.kind === 'reactAppShell',
    )
    const vueAppShellContributions = contributions.filter(
      (contribution): contribution is VueAppShellContribution => contribution.kind === 'vueAppShell',
    )
    const typeScriptConfigContributions = contributions.filter(
      (contribution): contribution is TypeScriptConfigContribution => contribution.kind === 'typescriptConfig',
    )
    const tsdownConfigContributions = contributions.filter(
      (contribution): contribution is TsdownConfigContribution => contribution.kind === 'tsdownConfig',
    )
    const providerArtifactContributions = contributions.filter(
      (contribution): contribution is ProviderArtifactContribution => contribution.kind === 'providerArtifact',
    )
    const providerManagedFileContributions = contributions.filter(
      (contribution): contribution is ProviderManagedFileContribution => contribution.kind === 'providerManagedFile',
    )
    const providerManagedBlockContributions = contributions.filter(
      (contribution): contribution is ProviderManagedBlockContribution => contribution.kind === 'providerManagedBlock',
    )

    const packageManifestSurfaces = groupBySurface(packageManifestContributions)
    const workspaceManifestSurfaces = groupBySurface(workspaceManifestContributions)
    const frontendEntrySurfaces = groupBySurface(frontendEntryContributions)
    const viteConfigSurfaces = groupBySurface(viteConfigContributions)
    const styleSheetSurfaces = groupBySurface(styleSheetContributions)

    yield* ensureUniqueProviderManagedTargets(providerManagedFileContributions, providerManagedBlockContributions)

    const packageJsonOperations = yield* Effect.all(
      [...packageManifestSurfaces.entries()].map(([surfaceId, surfaceContributions]) =>
        materializePackageJson(surfaceId, surfaceContributions)),
    )
    const frontendEntryOperations = yield* Effect.all(
      [...frontendEntrySurfaces.entries()].map(([surfaceId, surfaceContributions]) =>
        materializeFrontendEntry(surfaceId, surfaceContributions)),
    )
    const providerArtifactOperations = yield* Effect.all(
      providerArtifactContributions.map(materializeProviderArtifact),
    )
    const providerManagedFileOperations = yield* Effect.all(
      providerManagedFileContributions.map(materializeProviderManagedFile),
    )
    const providerManagedBlockOperations = yield* Effect.all(
      providerManagedBlockContributions.map(materializeProviderManagedBlock),
    )

    return {
      operations: [
        ...packageJsonOperations,
        ...[...workspaceManifestSurfaces.entries()].map(([surfaceId, surfaceContributions]) =>
          materializeWorkspaceManifest(surfaceId, surfaceContributions, packageManifestContributions)),
        ...materializeEslintRoot(eslintRootContributions),
        ...materializeKnipRoot(knipRootContributions),
        ...sourceContributions.map(materializeGeneratedUserFile),
        ...frontendEntryOperations,
        ...[...viteConfigSurfaces.entries()].map(([surfaceId, surfaceContributions]) =>
          materializeViteConfig(surfaceId, surfaceContributions)),
        ...[...styleSheetSurfaces.entries()].map(([surfaceId, surfaceContributions]) =>
          materializeStyleSheet(surfaceId, surfaceContributions)),
        ...typeScriptConfigContributions.map(materializeTypeScriptConfig),
        ...tsdownConfigContributions.map(materializeTsdownConfig),
        ...materializeReactAppShell(reactAppShellContributions),
        ...materializeVueAppShell(vueAppShellContributions),
        ...providerArtifactOperations,
        ...providerManagedFileOperations,
        ...providerManagedBlockOperations,
      ],
    }
  },
)
