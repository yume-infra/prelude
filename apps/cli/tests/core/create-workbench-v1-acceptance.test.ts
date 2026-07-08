import { fileURLToPath } from 'node:url'
import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makeTargetDir } from '@/brand/target-dir'
import { CliContext } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { FsLive } from '@/core/services/fs'
import { assertPathDoesNotExist, makeTempProjectDir, parseJson, pathJoin, readJson } from '../support/effect-files'
import { EffectHarnessDiscoveryTestLayer } from '../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

const fixtureRoot = new URL('../fixtures/fullscreen-create-workbench-v1/', import.meta.url)
const effectHarnessEquivalentSpecPath = fileURLToPath(new URL('effect-harness-current-equivalent.create-spec.json', fixtureRoot))
const minimalWorkspaceSpecPath = fileURLToPath(new URL('minimal-workspace.create-spec.json', fixtureRoot))
const nodeMonorepoWorkspaceV1SpecPath = fileURLToPath(new URL('node-monorepo-workspace-v1.create-spec.json', fixtureRoot))
const workspaceCliAbilitySpecPath = fileURLToPath(new URL('workspace-cli-ability.create-spec.json', fixtureRoot))
const workspaceCliQualityEnabledSpecPath = fileURLToPath(new URL('workspace-cli-quality-enabled.create-spec.json', fixtureRoot))

function runCreateRouteWithArgs(args: Record<string, unknown>, targetDir: string) {
  return runCreateRoute({
    preludeVersion: '0.0.0-test',
    targetDir: makeTargetDir(targetDir),
  }).pipe(
    Effect.provideService(CliContext, CliContext.of({
      args,
      isInteractive: false,
    })),
  )
}

function routeOutput(result: { readonly output?: string }) {
  if (result.output !== undefined) {
    return result.output
  }

  return assert.fail('expected create route to return output')
}

describe('fullscreen create workbench v1 acceptance fixtures', () => {
  it.layer(TestLayer)((it) => {
    it.effect('dry-runs the current effect-harness equivalent through direct --spec without writing files', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-workbench-v1-')
        const result = yield* runCreateRouteWithArgs({
          spec: effectHarnessEquivalentSpecPath,
          dryRun: true,
          noInput: true,
        }, targetDir)

        assert.equal(result.kind, 'dry-run')

        const output = parseJson(routeOutput(result)) as {
          operations: Array<{
            kind: string
            path: string
            authority: string
            value?: {
              'scripts'?: Record<string, string>
              'dependencies'?: Record<string, string>
              'devDependencies'?: Record<string, string>
              'typescript.preferences.autoImportFileExcludePatterns'?: readonly string[]
              'javascript.preferences.autoImportFileExcludePatterns'?: readonly string[]
              'files.watcherExclude'?: Record<string, boolean>
              'search.exclude'?: Record<string, boolean>
              'files.exclude'?: Record<string, boolean>
              'lsp'?: {
                'typescript-language-server'?: {
                  initialization_options?: {
                    preferences?: {
                      autoImportFileExcludePatterns?: readonly string[]
                    }
                  }
                }
              }
              'file_scan_exclusions'?: readonly string[]
              'artifact'?: {
                packageArtifactIdentity?: {
                  packageName?: string
                  packageVersion?: string
                  npmSelector?: string
                  neutralDiscoveryCommand?: string
                }
                artifactOnlyReferenceAudit?: {
                  mode?: string
                  references?: readonly {
                    id?: string
                    targetDelivery?: string
                    available?: boolean
                  }[]
                }
              }
              'placementSummary'?: {
                providerNamespacePath?: string
                targetTopology?: string
                workspaceToolingPackage?: string
                effectRuntimePackageScopes?: readonly string[]
                effectTestPackageScopes?: readonly string[]
                tsconfigTargets?: readonly string[]
                eslintEntry?: string
                editorSettingsTargets?: readonly string[]
                docsDeliveryMode?: string
                snippetsDeliveryMode?: string
              }
              'managedClaims'?: readonly {
                slot?: string
                locator?: string
                kind?: string
              }[]
              'surfaces'?: readonly { id: string, kind?: string, path?: string }[]
            }
          }>
          blockers: unknown[]
        }
        const paths = output.operations.map(operation => operation.path)
        const operationKinds = new Set(output.operations.map(operation => operation.kind))
        const packageJsonOperation = output.operations.find(operation => operation.path === 'package.json')
        const providerOperation = output.operations.find(operation => operation.path === '.prelude/providers/effect-harness/provider.json')

        assert.deepStrictEqual(output.blockers, [])
        assert.deepStrictEqual(result.blockers, [])
        assert.ok(paths.includes('package.json'))
        assert.ok(paths.includes('src/index.ts'))
        assert.ok(paths.includes('tsconfig.json'))
        assert.ok(paths.includes('eslint.config.mjs'))
        assert.ok(paths.includes('.vscode/settings.json'))
        assert.ok(paths.includes('.zed/settings.json'))
        assert.ok(paths.includes('knip.json'))
        assert.ok(paths.includes('.prelude/providers/effect-harness/provider.json'))
        assert.equal(paths.includes('AGENTS.md'), false)
        assert.equal(paths.some(path => path.startsWith('.codex/')), false)
        assert.ok(operationKinds.has('writeStructuredFile'))
        assert.ok(operationKinds.has('writeGeneratedUserFile'))
        assert.ok(operationKinds.has('writeProviderManagedFile'))
        assert.equal(operationKinds.has('writeManagedBlock'), false)
        const vscodeSettingsOperation = output.operations.find(operation => operation.path === '.vscode/settings.json')
        const zedSettingsOperation = output.operations.find(operation => operation.path === '.zed/settings.json')
        assert.deepEqual(vscodeSettingsOperation?.value?.['typescript.preferences.autoImportFileExcludePatterns'], ['repos/**'])
        assert.deepEqual(vscodeSettingsOperation?.value?.['javascript.preferences.autoImportFileExcludePatterns'], ['repos/**'])
        assert.deepEqual(vscodeSettingsOperation?.value?.['files.watcherExclude'], { 'repos/**': true })
        assert.deepEqual(vscodeSettingsOperation?.value?.['search.exclude'], { 'repos/**': true })
        assert.equal(vscodeSettingsOperation?.value?.['files.exclude'], undefined)
        assert.deepEqual(
          zedSettingsOperation?.value?.lsp?.['typescript-language-server']?.initialization_options?.preferences?.autoImportFileExcludePatterns,
          ['repos/**'],
        )
        assert.deepEqual(zedSettingsOperation?.value?.file_scan_exclusions, ['repos/**'])
        const providerSurfaceIds = new Set(providerOperation?.value?.surfaces?.map(surface => surface.id))
        assert.ok(providerSurfaceIds.has('provider-managed-block:effect-harness:eslint.config.mjs#provider-config'))
        assert.ok(providerSurfaceIds.has('editor-settings:.vscode/settings.json:/typescript.preferences.autoImportFileExcludePatterns'))
        assert.ok(providerSurfaceIds.has('editor-settings:.vscode/settings.json:/javascript.preferences.autoImportFileExcludePatterns'))
        assert.ok(providerSurfaceIds.has('editor-settings:.vscode/settings.json:/files.watcherExclude'))
        assert.ok(providerSurfaceIds.has('editor-settings:.vscode/settings.json:/search.exclude'))
        assert.ok(providerSurfaceIds.has('editor-settings:.zed/settings.json:/lsp/typescript-language-server/initialization_options/preferences/autoImportFileExcludePatterns'))
        assert.ok(providerSurfaceIds.has('editor-settings:.zed/settings.json:/file_scan_exclusions'))
        assert.equal(providerOperation?.value?.artifact?.packageArtifactIdentity?.packageName, '@sayoriqwq/effect-harness')
        assert.equal(providerOperation?.value?.artifact?.packageArtifactIdentity?.packageVersion, '0.0.4')
        assert.equal(providerOperation?.value?.artifact?.packageArtifactIdentity?.npmSelector, '@sayoriqwq/effect-harness@0.0.4')
        assert.equal(providerOperation?.value?.artifact?.packageArtifactIdentity?.neutralDiscoveryCommand, 'npx --yes --package @sayoriqwq/effect-harness@0.0.4 effect-harness provider-discover')
        assert.equal(providerOperation?.value?.artifact?.artifactOnlyReferenceAudit?.mode, 'artifact-only-reference-audit')
        assert.ok(providerOperation?.value?.artifact?.artifactOnlyReferenceAudit?.references?.some(reference =>
          reference.id === 'effect-source-tree'
          && reference.targetDelivery === 'artifact-only'
          && reference.available === true))
        assert.ok(providerOperation?.value?.artifact?.artifactOnlyReferenceAudit?.references?.some(reference =>
          reference.id === 'tsgo-source-tree'
          && reference.targetDelivery === 'artifact-only'
          && reference.available === true))
        assert.equal(providerOperation?.value?.placementSummary?.providerNamespacePath, '.prelude/providers/effect-harness')
        assert.equal(providerOperation?.value?.placementSummary?.targetTopology, 'single-package')
        assert.equal(providerOperation?.value?.placementSummary?.workspaceToolingPackage, 'root')
        assert.deepEqual(providerOperation?.value?.placementSummary?.effectRuntimePackageScopes, ['worker'])
        assert.deepEqual(providerOperation?.value?.placementSummary?.effectTestPackageScopes, ['worker'])
        assert.deepEqual(providerOperation?.value?.placementSummary?.tsconfigTargets, ['tsconfig.json'])
        assert.equal(providerOperation?.value?.placementSummary?.eslintEntry, 'eslint.config.mjs')
        assert.deepEqual(providerOperation?.value?.placementSummary?.editorSettingsTargets, ['.vscode/settings.json', '.zed/settings.json'])
        assert.equal(providerOperation?.value?.placementSummary?.docsDeliveryMode, 'copy')
        assert.equal(providerOperation?.value?.placementSummary?.snippetsDeliveryMode, 'copy')
        assert.ok(providerOperation?.value?.managedClaims?.some(claim =>
          claim.slot === 'effect-runtime-package'
          && claim.locator === 'package.json#/dependencies/effect'
          && claim.kind === 'structuredPointer'))
        assert.ok(providerOperation?.value?.managedClaims?.some(claim =>
          claim.slot === 'eslint-entry'
          && claim.locator === 'eslint.config.mjs#provider-config'
          && claim.kind === 'managedBlock'))
        assert.equal(packageJsonOperation?.value?.scripts?.verify, 'pnpm build && pnpm typecheck && pnpm test && pnpm lint --max-warnings 0 && pnpm knip')
        assert.equal(packageJsonOperation?.value?.scripts?.prepare, 'effect-tsgo patch')
        assert.equal(packageJsonOperation?.value?.scripts?.typecheck, 'tsgo --noEmit')
        assert.equal(packageJsonOperation?.value?.dependencies?.effect, '4.0.0-beta.92')
        assert.equal(packageJsonOperation?.value?.devDependencies?.knip, 'catalog:')
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, 'package.json'))
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
      }))

    it.effect('dry-runs the default minimal workspace intent without package abilities', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-workbench-v1-')
        const result = yield* runCreateRouteWithArgs({
          spec: minimalWorkspaceSpecPath,
          dryRun: true,
          noInput: true,
        }, targetDir)

        assert.equal(result.kind, 'dry-run')

        const output = parseJson(routeOutput(result)) as {
          operations: Array<{
            content?: string
            path: string
            value?: {
              scripts?: Record<string, string>
              devDependencies?: Record<string, string>
            }
          }>
          blockers: unknown[]
        }
        const paths = output.operations.map(operation => operation.path)
        const rootPackageJsonOperation = output.operations.find(operation => operation.path === 'package.json')
        const workspaceManifestOperation = output.operations.find(operation => operation.path === 'pnpm-workspace.yaml')

        assert.deepStrictEqual(output.blockers, [])
        assert.deepStrictEqual(paths, ['package.json', 'pnpm-workspace.yaml'])
        assert.equal(rootPackageJsonOperation?.value?.scripts, undefined)
        assert.equal(rootPackageJsonOperation?.value?.devDependencies, undefined)
        assert.match(workspaceManifestOperation?.content ?? '', / {2}- apps\/\*/u)
        assert.match(workspaceManifestOperation?.content ?? '', / {2}- libs\/\*/u)
        assert.equal(workspaceManifestOperation?.content?.includes('catalog:'), false)
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, 'package.json'))
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
      }))

    it.effect('dry-runs the explicit workspace CLI ability without hidden linting surfaces', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-workbench-v1-')
        const result = yield* runCreateRouteWithArgs({
          spec: workspaceCliAbilitySpecPath,
          dryRun: true,
          noInput: true,
        }, targetDir)

        assert.equal(result.kind, 'dry-run')

        const output = parseJson(routeOutput(result)) as {
          operations: Array<{
            content?: string
            path: string
            value?: {
              scripts?: Record<string, string>
              devDependencies?: Record<string, string>
            }
          }>
          blockers: unknown[]
        }
        const paths = output.operations.map(operation => operation.path)
        const rootPackageJsonOperation = output.operations.find(operation => operation.path === 'package.json')
        const workspaceManifestOperation = output.operations.find(operation => operation.path === 'pnpm-workspace.yaml')

        assert.deepStrictEqual(output.blockers, [])
        assert.ok(paths.includes('package.json'))
        assert.ok(paths.includes('pnpm-workspace.yaml'))
        assert.ok(paths.includes('apps/tool/package.json'))
        assert.ok(paths.includes('apps/tool/src/index.ts'))
        assert.ok(paths.includes('apps/tool/tsconfig.json'))
        assert.ok(paths.includes('apps/tool/tsdown.config.ts'))
        assert.equal(paths.includes('eslint.config.mjs'), false)
        assert.equal(paths.includes('knip.json'), false)
        assert.equal(rootPackageJsonOperation?.value?.scripts?.lint, undefined)
        assert.equal(rootPackageJsonOperation?.value?.scripts?.knip, undefined)
        assert.equal(rootPackageJsonOperation?.value?.scripts?.verify, undefined)
        assert.equal(rootPackageJsonOperation?.value?.devDependencies?.['@antfu/eslint-config'], undefined)
        assert.equal(rootPackageJsonOperation?.value?.devDependencies?.eslint, undefined)
        assert.equal(rootPackageJsonOperation?.value?.devDependencies?.knip, undefined)
        assert.match(workspaceManifestOperation?.content ?? '', /typescript: 6\.0\.3/u)
        assert.match(workspaceManifestOperation?.content ?? '', /tsdown: \^0\.21\.10/u)
        assert.equal(workspaceManifestOperation?.content?.includes('@antfu/eslint-config'), false)
        assert.equal(workspaceManifestOperation?.content?.includes('eslint: ^10.3.0'), false)
        assert.equal(workspaceManifestOperation?.content?.includes('knip: ^6.12.0'), false)
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, 'package.json'))
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
      }))

    it.effect('dry-runs an explicit quality-enabled workspace CLI equivalent with Antfu and Knip', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-workbench-v1-')
        const result = yield* runCreateRouteWithArgs({
          spec: workspaceCliQualityEnabledSpecPath,
          dryRun: true,
          noInput: true,
        }, targetDir)

        assert.equal(result.kind, 'dry-run')

        const output = parseJson(routeOutput(result)) as {
          operations: Array<{
            content?: string
            path: string
            value?: {
              scripts?: Record<string, string>
              devDependencies?: Record<string, string>
            }
          }>
          blockers: unknown[]
        }
        const paths = output.operations.map(operation => operation.path)
        const rootPackageJsonOperation = output.operations.find(operation => operation.path === 'package.json')
        const workspaceManifestOperation = output.operations.find(operation => operation.path === 'pnpm-workspace.yaml')

        assert.deepStrictEqual(output.blockers, [])
        assert.ok(paths.includes('eslint.config.mjs'))
        assert.ok(paths.includes('knip.json'))
        assert.equal(rootPackageJsonOperation?.value?.scripts?.lint, 'eslint .')
        assert.equal(rootPackageJsonOperation?.value?.scripts?.knip, 'knip')
        assert.equal(rootPackageJsonOperation?.value?.scripts?.verify, 'pnpm build && pnpm lint && pnpm knip')
        assert.equal(rootPackageJsonOperation?.value?.devDependencies?.['@antfu/eslint-config'], 'catalog:')
        assert.equal(rootPackageJsonOperation?.value?.devDependencies?.eslint, 'catalog:')
        assert.equal(rootPackageJsonOperation?.value?.devDependencies?.knip, 'catalog:')
        assert.match(workspaceManifestOperation?.content ?? '', /'@antfu\/eslint-config': 8\.2\.0/u)
        assert.match(workspaceManifestOperation?.content ?? '', /eslint: \^10\.3\.0/u)
        assert.match(workspaceManifestOperation?.content ?? '', /knip: \^6\.12\.0/u)
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, 'package.json'))
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
      }))

    it.effect('prints the default minimal workspace intent through direct --spec without writing files', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-workbench-v1-')
        const fixture = yield* readJson<unknown>(minimalWorkspaceSpecPath)
        const result = yield* runCreateRouteWithArgs({
          spec: minimalWorkspaceSpecPath,
          printSpec: true,
          noInput: true,
        }, targetDir)

        assert.equal(result.kind, 'printed-spec')
        assert.deepStrictEqual(parseJson(routeOutput(result)), fixture)
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, 'package.json'))
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
      }))

    it.effect('dry-runs the node monorepo workspace v1 ability with turbo, quality, and effect-harness maintain', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-workbench-v1-')
        const result = yield* runCreateRouteWithArgs({
          spec: nodeMonorepoWorkspaceV1SpecPath,
          dryRun: true,
          noInput: true,
        }, targetDir)

        assert.equal(result.kind, 'dry-run')

        const output = parseJson(routeOutput(result)) as {
          operations: Array<{
            kind: string
            path: string
            authority: string
            content?: string
            value?: {
              scripts?: Record<string, string>
              dependencies?: Record<string, string>
              devDependencies?: Record<string, string>
              projectedContext?: {
                topology: string
                packageScopes: readonly string[]
                packagePaths?: Record<string, string>
              }
              artifact?: {
                packageArtifactIdentity?: {
                  packageName?: string
                  packageVersion?: string
                  npmSelector?: string
                  neutralDiscoveryCommand?: string
                }
              }
              placementSummary?: {
                targetTopology?: string
                workspaceToolingPackage?: string
                effectRuntimePackageScopes?: readonly string[]
                effectTestPackageScopes?: readonly string[]
                tsconfigTargets?: readonly string[]
                eslintEntry?: string
                editorSettingsTargets?: readonly string[]
                providerNamespacePath?: string
              }
              managedClaims?: readonly {
                slot?: string
                locator?: string
                kind?: string
              }[]
              surfaces?: readonly { id: string }[]
            }
          }>
          blockers: unknown[]
        }
        const paths = output.operations.map(operation => operation.path)
        const rootPackageJsonOperation = output.operations.find(operation => operation.path === 'package.json')
        const nodePackageJsonOperation = output.operations.find(operation => operation.path === 'apps/node/package.json')
        const workspaceManifestOperation = output.operations.find(operation => operation.path === 'pnpm-workspace.yaml')
        const providerOperation = output.operations.find(operation => operation.path === '.prelude/providers/effect-harness/provider.json')

        assert.deepStrictEqual(output.blockers, [])
        assert.ok(paths.includes('package.json'))
        assert.ok(paths.includes('pnpm-workspace.yaml'))
        assert.ok(paths.includes('turbo.json'))
        assert.ok(paths.includes('eslint.config.mjs'))
        assert.ok(paths.includes('knip.json'))
        assert.ok(paths.includes('apps/node/package.json'))
        assert.ok(paths.includes('apps/node/src/index.ts'))
        assert.ok(paths.includes('apps/node/tsconfig.json'))
        assert.ok(paths.includes('apps/node/tsdown.config.ts'))
        assert.ok(paths.includes('.prelude/providers/effect-harness/provider.json'))
        assert.equal(paths.includes('AGENTS.md'), false)
        assert.equal(paths.some(path => path.startsWith('.codex/')), false)
        assert.equal(rootPackageJsonOperation?.value?.scripts?.build, 'turbo run build')
        assert.equal(rootPackageJsonOperation?.value?.scripts?.typecheck, 'turbo run typecheck')
        assert.equal(rootPackageJsonOperation?.value?.scripts?.lint, 'eslint')
        assert.equal(rootPackageJsonOperation?.value?.scripts?.knip, 'knip')
        assert.equal(rootPackageJsonOperation?.value?.scripts?.['effect:verify'], undefined)
        assert.equal(rootPackageJsonOperation?.value?.scripts?.verify, 'pnpm build && pnpm typecheck && pnpm -r --if-present test && pnpm lint --max-warnings 0 && pnpm knip')
        assert.equal(rootPackageJsonOperation?.value?.devDependencies?.turbo, 'catalog:')
        assert.equal(rootPackageJsonOperation?.value?.devDependencies?.['@antfu/eslint-config'], '^9.0.0')
        assert.equal(rootPackageJsonOperation?.value?.devDependencies?.eslint, '^10.3.0')
        assert.equal(nodePackageJsonOperation?.value?.dependencies?.effect, '4.0.0-beta.92')
        assert.equal(nodePackageJsonOperation?.value?.devDependencies?.['@effect/tsgo'], '0.15.0')
        assert.equal(nodePackageJsonOperation?.value?.scripts?.test, 'vitest run')
        assert.match(workspaceManifestOperation?.content ?? '', / {2}- apps\/\*/u)
        assert.match(workspaceManifestOperation?.content ?? '', /turbo: \^2\.9\.9/u)
        assert.match(workspaceManifestOperation?.content ?? '', /'@types\/node': 25\.6\.0/u)
        assert.equal(providerOperation?.value?.projectedContext?.topology, 'workspace')
        assert.deepStrictEqual(providerOperation?.value?.projectedContext?.packageScopes, ['node'])
        assert.deepStrictEqual(providerOperation?.value?.projectedContext?.packagePaths, {
          node: 'apps/node',
        })
        assert.equal(providerOperation?.value?.artifact?.packageArtifactIdentity?.packageName, '@sayoriqwq/effect-harness')
        assert.equal(providerOperation?.value?.artifact?.packageArtifactIdentity?.packageVersion, '0.0.4')
        assert.equal(providerOperation?.value?.artifact?.packageArtifactIdentity?.npmSelector, '@sayoriqwq/effect-harness@0.0.4')
        assert.equal(providerOperation?.value?.artifact?.packageArtifactIdentity?.neutralDiscoveryCommand, 'npx --yes --package @sayoriqwq/effect-harness@0.0.4 effect-harness provider-discover')
        assert.equal(providerOperation?.value?.placementSummary?.targetTopology, 'workspace')
        assert.equal(providerOperation?.value?.placementSummary?.workspaceToolingPackage, 'root')
        assert.deepStrictEqual(providerOperation?.value?.placementSummary?.effectRuntimePackageScopes, ['node'])
        assert.deepStrictEqual(providerOperation?.value?.placementSummary?.effectTestPackageScopes, ['node'])
        assert.deepStrictEqual(providerOperation?.value?.placementSummary?.tsconfigTargets, ['apps/node/tsconfig.json'])
        assert.equal(providerOperation?.value?.placementSummary?.eslintEntry, 'eslint.config.mjs')
        assert.deepStrictEqual(providerOperation?.value?.placementSummary?.editorSettingsTargets, ['.vscode/settings.json', '.zed/settings.json'])
        assert.equal(providerOperation?.value?.placementSummary?.providerNamespacePath, '.prelude/providers/effect-harness')
        assert.ok(providerOperation?.value?.managedClaims?.some(claim =>
          claim.slot === 'effect-runtime-package'
          && claim.locator === 'apps/node/package.json#/dependencies/effect'
          && claim.kind === 'structuredPointer'))
        assert.ok(providerOperation?.value?.managedClaims?.some(claim =>
          claim.slot === 'effect-tsconfig'
          && claim.locator === 'apps/node/tsconfig.json#/compilerOptions/plugins'
          && claim.kind === 'structuredPointer'))
        assert.equal(providerOperation?.value?.surfaces?.some(surface => surface.id.startsWith('tsconfig:root:')), false)
        assert.equal(providerOperation?.value?.surfaces?.some(surface => surface.id === 'tsconfig:apps/node:/compilerOptions/plugins'), true)
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
      }))
  })
})
