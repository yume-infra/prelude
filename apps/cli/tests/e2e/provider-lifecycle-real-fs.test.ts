import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import { makePackageName } from '@/brand/package-name'
import { makeTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec } from '@/core/create'
import { effectHarnessLifecycleProviderForDiscovery, runProviderLifecycleStatus, runProviderLifecycleUpdate, runProviderLifecycleVerify } from '@/core/lifecycle'
import { FsLive } from '@/core/services/fs'
import { makeTempProjectDir, pathJoinSync, readFileString, readJson, stringifyJson } from '../support/effect-files'
import { effectHarnessDiscoveryFixture, EffectHarnessDiscoveryTestLayer } from '../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

const lifecycleProviders = {
  'effect-harness': effectHarnessLifecycleProviderForDiscovery(effectHarnessDiscoveryFixture),
}

interface PackageJsonFixture {
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  readonly [key: string]: unknown
}

interface ProviderSurfaceFixture {
  readonly id: string
  readonly kind: string
  readonly path: string
  readonly pointer?: string
  base?: string
  snapshot?: string
  readonly [key: string]: unknown
}

interface ProviderRecordFixture {
  surfaces: ProviderSurfaceFixture[]
  readonly [key: string]: unknown
}

function writeFileString(filePath: string, content: string) {
  return Effect.flatMap(FileSystem.FileSystem, fs => fs.writeFileString(filePath, content))
}

function writeJson(filePath: string, value: unknown) {
  return writeFileString(filePath, `${stringifyJson(value)}\n`)
}

function findStructuredSurface(record: ProviderRecordFixture, path: string, pointer: string) {
  const surface = record.surfaces.find(candidate =>
    candidate.kind === 'structuredPointer'
    && candidate.path === path
    && candidate.pointer === pointer)

  assert.notEqual(surface, undefined, `${path}#${pointer} should be managed`)
  return surface!
}

function setStructuredSurfaceBase(record: ProviderRecordFixture, path: string, pointer: string, base: string) {
  const surface = findStructuredSurface(record, path, pointer)
  surface.base = base
  surface.snapshot = base
  return surface
}

describe('provider lifecycle real filesystem e2e', () => {
  it.layer(TestLayer)((it) => {
    it.effect('covers create, status, verify, managed drift blocking, ordinary drift ignoring, update, and base refresh', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-provider-lifecycle-real-fs-')
        const target = makeTargetDir(targetDir)

        yield* createProjectFromSpec({
          spec: {
            topology: 'single-package',
            package: {
              id: 'worker',
              name: makePackageName('real-fs-worker'),
              capabilities: ['effect-package'],
            },
            rootCapabilities: ['package-manager:pnpm', 'linting', 'knip', 'ai-harness'],
            providers: ['effect-harness'],
            overrides: {},
          },
          targetDir: target,
          preludeVersion: '0.0.0-test',
        })

        const providerRecordPath = pathJoinSync(targetDir, '.prelude/providers/effect-harness/provider.json')
        const packageJsonPath = pathJoinSync(targetDir, 'package.json')
        const sourcePath = pathJoinSync(targetDir, 'src/index.ts')

        const providerRecord = yield* readJson<ProviderRecordFixture>(providerRecordPath)
        const packageJson = yield* readJson<PackageJsonFixture>(packageJsonPath)
        const initialStatus = yield* runProviderLifecycleStatus({
          targetDir: target,
          provider: 'effect-harness',
          providers: lifecycleProviders,
        })
        assert.equal(initialStatus.status, 'completed')
        assert.equal(initialStatus.providers[0]?.status, 'ok')
        assert.deepEqual(initialStatus.providers[0]?.packageArtifactIdentity, effectHarnessDiscoveryFixture.packageArtifactIdentity)
        assert.deepEqual(initialStatus.providers[0]?.placementSummary, providerRecord.placementSummary)
        assert.deepEqual(initialStatus.providers[0]?.managedClaims, providerRecord.managedClaims)

        const initialVerify = yield* runProviderLifecycleVerify({
          targetDir: target,
          provider: 'effect-harness',
          providers: lifecycleProviders,
        })
        assert.equal(initialVerify.status, 'completed')
        assert.equal(initialVerify.providers[0]?.status, 'passed')

        const packageJsonBeforeManagedDrift = yield* readFileString(packageJsonPath)
        const providerRecordBeforeManagedDrift = yield* readFileString(providerRecordPath)
        const managedDriftPackageJson = yield* readJson<PackageJsonFixture>(packageJsonPath)
        managedDriftPackageJson.devDependencies['@effect/tsgo'] = 'manual-drift'
        yield* writeJson(packageJsonPath, managedDriftPackageJson)

        const managedDriftUpdate = yield* Effect.result(runProviderLifecycleUpdate({
          targetDir: target,
          provider: 'effect-harness',
          providers: lifecycleProviders,
        }))
        assert.equal(managedDriftUpdate._tag, 'Failure')
        if (managedDriftUpdate._tag === 'Failure') {
          assert.match(managedDriftUpdate.failure.message, /drifted/u)
          assert.match(managedDriftUpdate.failure.message, /package\.json/u)
        }
        assert.equal(yield* readFileString(providerRecordPath), providerRecordBeforeManagedDrift)
        yield* writeFileString(packageJsonPath, packageJsonBeforeManagedDrift)

        const sourceDrift = `${yield* readFileString(sourcePath)}// handed-off scaffold drift must survive provider update\n`
        yield* writeFileString(sourcePath, sourceDrift)

        const staleEffectVersion = '0.0.0-real-fs-e2e'
        const stalePackageJson = yield* readJson<PackageJsonFixture>(packageJsonPath)
        stalePackageJson.dependencies.effect = staleEffectVersion
        yield* writeJson(packageJsonPath, stalePackageJson)

        const staleProviderRecord = yield* readJson<ProviderRecordFixture>(providerRecordPath)
        const staleSurface = setStructuredSurfaceBase(staleProviderRecord, 'package.json', '/dependencies/effect', staleEffectVersion)
        yield* writeJson(providerRecordPath, staleProviderRecord)

        const staleVerify = yield* runProviderLifecycleVerify({
          targetDir: target,
          provider: 'effect-harness',
          providers: lifecycleProviders,
        })
        assert.equal(staleVerify.status, 'completed')
        assert.equal(staleVerify.providers[0]?.status, 'failed')
        assert.match(String(staleVerify.providers[0]?.message), /not up to date/u)

        const update = yield* runProviderLifecycleUpdate({
          targetDir: target,
          provider: 'effect-harness',
          providers: lifecycleProviders,
        })
        assert.equal(update.status, 'completed')
        assert.equal(update.providers[0]?.status, 'passed')

        const refreshedPackageJson = yield* readJson<PackageJsonFixture>(packageJsonPath)
        assert.equal(refreshedPackageJson.dependencies.effect, packageJson.dependencies.effect)
        const refreshedProviderRecord = yield* readJson<ProviderRecordFixture>(providerRecordPath)
        const refreshedSurface = findStructuredSurface(refreshedProviderRecord, staleSurface.path, staleSurface.pointer!)
        assert.equal(refreshedSurface.base, packageJson.dependencies.effect)
        assert.equal(refreshedSurface.snapshot, packageJson.dependencies.effect)
        assert.equal(yield* readFileString(sourcePath), sourceDrift)

        const finalVerify = yield* runProviderLifecycleVerify({
          targetDir: target,
          provider: 'effect-harness',
          providers: lifecycleProviders,
        })
        assert.equal(finalVerify.status, 'completed')
        assert.equal(finalVerify.providers[0]?.status, 'passed')
      }))
  })
})
