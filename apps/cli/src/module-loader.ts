import type {
  ArtifactIdentity,
  ArtifactObservationError,
  ArtifactPath,
  HarnessModule,
  HarnessModuleContext,
  ModulePlan,
  ObservationLocator,
  PackageRoot,
  ReadonlyArtifactAssets,
  ReadonlyTarget,
  TargetObservationError,
} from '@sayoriqwq/prelude-contract'
import type { IntegrationConfig } from './config.js'

import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  checkProtocolCompatibility,
  decodeHarnessModuleDescriptor,
  decodeModulePlan,
  MODULE_PROTOCOL_V2,
  PRELUDE_V2_SUPPORTED_FEATURES,
} from '@sayoriqwq/prelude-contract'
import { Effect, FileSystem, Path, Schema } from 'effect'
import { resolve as resolveEsm } from 'import-meta-resolve'
import { linkedSelectionPath, selectRootArtifact } from './artifact-selection.js'
import { integrationWorkspaceRelativePath } from './config.js'
import { errorMessage, preludeError, PreludeError } from './errors.js'
import { assertNoSymlinkSegments, noFollowEntryKind, resolveWithin } from './filesystem.js'

export interface LoadedIntegration {
  readonly config: IntegrationConfig
  readonly integrationWorkspace: string
  readonly artifactRoot: string
  readonly artifact: ArtifactIdentity
  readonly descriptor: ReturnType<typeof decodeHarnessModuleDescriptor>
  readonly plan: ModulePlan
}

function packageName(moduleExport: string): string {
  const parts = moduleExport.split('/')
  return moduleExport.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]!
}

function artifactObservationError(operation: ArtifactObservationError['operation'], path: ArtifactPath, error: unknown): ArtifactObservationError {
  return { _tag: 'ArtifactObservationError', operation, path, message: errorMessage(error) }
}

function targetObservationError(operation: TargetObservationError['operation'], locator: ObservationLocator, error: unknown): TargetObservationError {
  return { _tag: 'TargetObservationError', operation, locator, message: errorMessage(error) }
}

type FileSystemService = FileSystem.FileSystem
type PathService = Path.Path

function providePlatform<A, E>(
  effect: Effect.Effect<A, E, FileSystem.FileSystem | Path.Path>,
  fs: FileSystemService,
  path: PathService,
): Effect.Effect<A, E> {
  return effect.pipe(
    Effect.provideService(FileSystem.FileSystem, fs),
    Effect.provideService(Path.Path, path),
  )
}

function readonlyArtifactAssets(root: string, fsService: FileSystemService, pathService: PathService): ReadonlyArtifactAssets {
  const resolve = (relative: ArtifactPath) => resolveWithin(root, relative, 'planning').pipe(
    Effect.tap(path => assertNoSymlinkSegments(root, path, 'planning')),
  )
  const readBytes = (relative: ArtifactPath) => providePlatform(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const absolute = yield* resolve(relative)
    if (!(yield* fs.exists(absolute)))
      return undefined
    return yield* fs.readFile(absolute)
  }), fsService, pathService).pipe(Effect.mapError(error => artifactObservationError('readBytes', relative, error)))
  const readText = (relative: ArtifactPath) => providePlatform(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const absolute = yield* resolve(relative)
    if (!(yield* fs.exists(absolute)))
      return undefined
    return yield* fs.readFileString(absolute)
  }), fsService, pathService).pipe(Effect.mapError(error => artifactObservationError('readText', relative, error)))
  const readDirectory = (relative: ArtifactPath) => providePlatform(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const absolute = yield* resolve(relative)
    if (!(yield* fs.exists(absolute)))
      return undefined
    const names = yield* fs.readDirectory(absolute)
    return yield* Effect.forEach(names.sort(), name => noFollowEntryKind(pathService.join(absolute, name), 'planning').pipe(
      Effect.map(kind => ({ name, kind })),
    ))
  }), fsService, pathService).pipe(Effect.mapError(error => artifactObservationError('readDirectory', relative, error)))
  return { readBytes, readText, readDirectory }
}

function resolveObservationLocator(
  controlRoot: string,
  integrationWorkspace: string,
  packageRoots: ReadonlyArray<string>,
  locator: ObservationLocator,
): Effect.Effect<string, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const baseRelative = locator.root === 'ControlRoot'
      ? '.'
      : locator.root === 'IntegrationWorkspace'
        ? integrationWorkspace
        : locator.packageRoot
    if (locator.root === 'PackageRoot' && !packageRoots.includes(locator.packageRoot))
      return yield* Effect.fail(preludeError('planning', 'Observation Package Root is not approved for this Integration', locator.packageRoot))
    const base = yield* resolveWithin(controlRoot, baseRelative, 'planning')
    const absolute = yield* resolveWithin(base, locator.path, 'planning')
    yield* assertNoSymlinkSegments(controlRoot, absolute, 'planning')
    return absolute
  })
}

export function readonlyTarget(
  controlRoot: string,
  integrationWorkspace: string,
  packageRoots: ReadonlyArray<string>,
  fsService: FileSystemService,
  pathService: PathService,
): ReadonlyTarget {
  const resolve = (locator: ObservationLocator) => resolveObservationLocator(
    controlRoot,
    integrationWorkspace,
    packageRoots,
    locator,
  )
  const readBytes = (locator: ObservationLocator) => providePlatform(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const absolute = yield* resolve(locator)
    if (!(yield* fs.exists(absolute)))
      return undefined
    return yield* fs.readFile(absolute)
  }), fsService, pathService).pipe(Effect.mapError(error => targetObservationError('readBytes', locator, error)))
  const readText = (locator: ObservationLocator) => providePlatform(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const absolute = yield* resolve(locator)
    if (!(yield* fs.exists(absolute)))
      return undefined
    return yield* fs.readFileString(absolute)
  }), fsService, pathService).pipe(Effect.mapError(error => targetObservationError('readText', locator, error)))
  const readDirectory = (locator: ObservationLocator) => providePlatform(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const absolute = yield* resolve(locator)
    if (!(yield* fs.exists(absolute)))
      return undefined
    const names = yield* fs.readDirectory(absolute)
    return yield* Effect.forEach(names.sort(), name => noFollowEntryKind(pathService.join(absolute, name), 'planning').pipe(
      Effect.map(kind => ({ name, kind })),
    ))
  }), fsService, pathService).pipe(Effect.mapError(error => targetObservationError('readDirectory', locator, error)))
  const readPackageManifest = (packageRoot: PackageRoot) => {
    const locator: ObservationLocator = { root: 'PackageRoot', packageRoot, path: 'package.json' }
    return readText(locator).pipe(
      Effect.flatMap(source => source === undefined
        ? Effect.succeed(undefined)
        : Effect.try({
            try: () => JSON.parse(source) as Schema.JsonObject,
            catch: error => targetObservationError('readPackageManifest', locator, error),
          })),
    )
  }
  return { readBytes, readText, readDirectory, readPackageManifest }
}

export function loadIntegration(controlRoot: string, config: IntegrationConfig): Effect.Effect<LoadedIntegration, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const manifestSource = yield* fs.readFileString(path.join(controlRoot, 'package.json')).pipe(
      Effect.mapError(error => preludeError('artifact', 'Cannot read Control Root package.json', errorMessage(error))),
    )
    const manifest = yield* Effect.try({ try: () => JSON.parse(manifestSource) as Record<string, unknown>, catch: error => preludeError('artifact', 'Invalid Control Root package.json', errorMessage(error)) })
    const name = packageName(config.module)
    if (typeof (manifest.devDependencies as Record<string, unknown> | undefined)?.[name] !== 'string')
      return yield* Effect.fail(preludeError('artifact', 'Harness Artifact must be a direct root devDependencies entry', name))
    for (const packageRoot of config.packageRoots) {
      const root = yield* resolveWithin(controlRoot, packageRoot, 'config')
      yield* assertNoSymlinkSegments(controlRoot, root, 'config')
      if (!(yield* fs.exists(path.join(root, 'package.json'))))
        return yield* Effect.fail(preludeError('config', 'Approved Package Root has no package.json', packageRoot))
    }
    const lockSource = yield* fs.readFileString(path.join(controlRoot, 'pnpm-lock.yaml')).pipe(Effect.mapError(error => preludeError('artifact', 'Control Root pnpm-lock.yaml is required', errorMessage(error))))
    const installedLockSource = yield* fs.readFileString(path.join(controlRoot, 'node_modules/.pnpm/lock.yaml')).pipe(Effect.mapError(error => preludeError('artifact', 'Installed pnpm lock evidence is required', errorMessage(error))))
    const entryUrl = yield* Effect.try({ try: () => resolveEsm(config.module, pathToFileURL(path.join(controlRoot, 'package.json')).href), catch: error => preludeError('artifact', `Cannot resolve ESM export ${config.module}`, errorMessage(error)) })
    const entry = fileURLToPath(entryUrl)
    const installedArtifact = yield* findPackageManifest(entry, name)
    const artifactRoot = installedArtifact.root
    const selected = yield* Effect.try({ try: () => selectRootArtifact({ manifestSource, lockSource, installedLockSource, packageName: name, installedManifestSource: installedArtifact.source }), catch: error => preludeError('artifact', `Artifact selection mismatch for ${name}`, errorMessage(error)) })
    const linkedPath = linkedSelectionPath(selected.lockVersion)
    if (linkedPath !== undefined) {
      const selectedRealPath = yield* fs.realPath(path.resolve(controlRoot, linkedPath)).pipe(Effect.mapError(error => preludeError('artifact', `Cannot resolve linked Artifact ${name}`, errorMessage(error))))
      const installedRealPath = yield* fs.realPath(artifactRoot).pipe(Effect.mapError(error => preludeError('artifact', `Cannot resolve installed Artifact ${name}`, errorMessage(error))))
      if (selectedRealPath !== installedRealPath)
        return yield* Effect.fail(preludeError('artifact', `Installed linked Artifact does not match selected path for ${name}`))
    }
    const installedPrelude = yield* findPackageManifest(fileURLToPath(import.meta.url), '@sayoriqwq/prelude')
    yield* Effect.try({ try: () => selectRootArtifact({ manifestSource, lockSource, installedLockSource, packageName: '@sayoriqwq/prelude', installedManifestSource: installedPrelude.source }), catch: error => preludeError('artifact', 'Prelude selection does not match the root lockfile', errorMessage(error)) })
    yield* assertNoSymlinkSegments(path.join(controlRoot, 'node_modules'), entry, 'artifact')

    const imported = yield* Effect.tryPromise({ try: () => import(entryUrl), catch: error => preludeError('artifact', `Cannot import ${config.module}`, errorMessage(error)) })
    const candidate: unknown = imported.harnessModule
    if (candidate === null || typeof candidate !== 'object' || typeof (candidate as { plan?: unknown }).plan !== 'function')
      return yield* Effect.fail(preludeError('artifact', `${config.module} must export named harnessModule`))
    const module = candidate as HarnessModule<PreludeError>
    const descriptor = yield* Effect.try({ try: () => decodeHarnessModuleDescriptor(module.descriptor), catch: error => preludeError('artifact', 'Malformed Harness Module descriptor', errorMessage(error)) })
    const host = { supportedProtocolVersions: [MODULE_PROTOCOL_V2] as [number], supportedFeatures: [...PRELUDE_V2_SUPPORTED_FEATURES] }
    const compatibility = checkProtocolCompatibility(descriptor, host)
    if (!compatibility.compatible)
      return yield* Effect.fail(preludeError('artifact', 'Unsupported Harness Module protocol or required features', JSON.stringify(compatibility)))
    const artifact: ArtifactIdentity = { packageName: name, packageVersion: selected.packageVersion, module: config.module, resolutionId: selected.resolutionId }
    const integrationWorkspace = integrationWorkspaceRelativePath(config.id)
    const context: HarnessModuleContext = {
      integration: { integrationId: config.id, packageRoots: config.packageRoots },
      artifact,
      host,
      artifactAssets: readonlyArtifactAssets(artifactRoot, fs, path),
      target: readonlyTarget(controlRoot, integrationWorkspace, config.packageRoots, fs, path),
    }
    const rawPlan = yield* module.plan(context).pipe(Effect.mapError(error => preludeError('planning', `Harness Module ${config.id} failed`, errorMessage(error))))
    const plan = yield* Effect.try({ try: () => decodeModulePlan(rawPlan), catch: error => preludeError('planning', `Harness Module ${config.id} returned an invalid plan`, errorMessage(error)) })
    return { config, integrationWorkspace, artifactRoot, artifact, descriptor, plan }
  }).pipe(Effect.mapError(error => Schema.is(PreludeError)(error) ? error : preludeError('artifact', 'Cannot inspect Harness Artifact', errorMessage(error))))
}

function findPackageManifest(start: string, expectedName: string): Effect.Effect<{ readonly root: string, readonly source: string }, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    let current = path.dirname(start)
    while (true) {
      const candidatePath = path.join(current, 'package.json')
      if (yield* fs.exists(candidatePath)) {
        const source = yield* fs.readFileString(candidatePath)
        const packageManifest = JSON.parse(source) as { name?: unknown }
        if (packageManifest.name === expectedName)
          return { root: current, source }
      }
      const parent = path.dirname(current)
      if (parent === current)
        return yield* Effect.fail(preludeError('artifact', `Cannot locate installed package identity for ${expectedName}`))
      current = parent
    }
  }).pipe(Effect.mapError(error => Schema.is(PreludeError)(error) ? error : preludeError('artifact', `Cannot inspect installed package ${expectedName}`, errorMessage(error))))
}
