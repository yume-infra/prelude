import type { ArtifactIdentity, HarnessModule, HarnessModuleContext, ModulePlan, ObservationError, ReadonlyArtifactAssets, ReadonlyTarget } from '@sayoriqwq/prelude-contract'
import type { IntegrationConfig } from './config.js'

import { fileURLToPath, pathToFileURL } from 'node:url'
import {

  checkProtocolCompatibility,
  decodeHarnessModuleDescriptor,
  decodeModulePlan,

  MODULE_PROTOCOL_V1,

  PRELUDE_V1_SUPPORTED_FEATURES,

} from '@sayoriqwq/prelude-contract'

import { Effect, FileSystem, Path, Schema } from 'effect'
import { resolve as resolveEsm } from 'import-meta-resolve'
import { linkedSelectionPath, selectRootArtifact } from './artifact-selection.js'
import { errorMessage, preludeError, PreludeError } from './errors.js'
import { assertNoSymlinkSegments, resolveWithin } from './filesystem.js'

export interface LoadedIntegration {
  readonly config: IntegrationConfig
  readonly artifactRoot: string
  readonly artifact: ArtifactIdentity
  readonly descriptor: ReturnType<typeof decodeHarnessModuleDescriptor>
  readonly plan: ModulePlan
}

function packageName(moduleExport: string): string {
  const parts = moduleExport.split('/')
  return moduleExport.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]!
}

function observationError(operation: ObservationError['operation'], path: string, error: unknown): ObservationError {
  return { _tag: 'ObservationError', operation, path, message: errorMessage(error) }
}

function readonlyFiles(root: string, target: boolean): ReadonlyArtifactAssets | ReadonlyTarget {
  const resolve = (relative: string) => resolveWithin(root, relative, 'planning').pipe(
    Effect.tap(path => assertNoSymlinkSegments(root, path, 'planning')),
  )
  const readBytes = (relative: string) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const absolute = yield* resolve(relative)
    if (!(yield* fs.exists(absolute)))
      return undefined
    return yield* fs.readFile(absolute)
  }).pipe(Effect.mapError(error => observationError('readBytes', relative, error)))
  const readText = (relative: string) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const absolute = yield* resolve(relative)
    if (!(yield* fs.exists(absolute)))
      return undefined
    return yield* fs.readFileString(absolute)
  }).pipe(Effect.mapError(error => observationError('readText', relative, error)))
  const readDirectory = (relative: string) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const absolute = yield* resolve(relative)
    if (!(yield* fs.exists(absolute)))
      return undefined
    const names = yield* fs.readDirectory(absolute)
    const entries = yield* Effect.forEach(names.sort(), name => Effect.gen(function* () {
      const info = yield* fs.stat(`${absolute}/${name}`)
      const kind = info.type === 'File' ? 'file' as const : info.type === 'Directory' ? 'directory' as const : info.type === 'SymbolicLink' ? 'symbolicLink' as const : 'other' as const
      return { name, kind }
    }))
    return entries
  }).pipe(Effect.mapError(error => observationError('readDirectory', relative, error)))

  if (!target)
    return { readBytes, readText, readDirectory } as ReadonlyArtifactAssets
  return {
    readBytes,
    readText,
    readDirectory,
    readPackageManifest: packageRoot => Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const absolute = yield* resolveWithin(root, packageRoot === '.' ? 'package.json' : `${packageRoot}/package.json`, 'planning')
      yield* assertNoSymlinkSegments(root, absolute, 'planning')
      if (!(yield* fs.exists(absolute)))
        return undefined
      const source = yield* fs.readFileString(absolute)
      return JSON.parse(source) as Schema.JsonObject
    }).pipe(Effect.mapError(error => observationError('readPackageManifest', packageRoot, error))),
  } as ReadonlyTarget
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
    const host = { supportedProtocolVersions: [MODULE_PROTOCOL_V1] as [number], supportedFeatures: [...PRELUDE_V1_SUPPORTED_FEATURES] }
    const compatibility = checkProtocolCompatibility(descriptor, host)
    if (!compatibility.compatible)
      return yield* Effect.fail(preludeError('artifact', 'Unsupported Harness Module protocol or required features', JSON.stringify(compatibility)))
    const artifact: ArtifactIdentity = { packageName: name, packageVersion: selected.packageVersion, module: config.module, resolutionId: selected.resolutionId }
    const targetScopeRoot = yield* resolveWithin(controlRoot, config.packageRoot, 'planning')
    yield* assertNoSymlinkSegments(controlRoot, targetScopeRoot, 'planning')
    const context: HarnessModuleContext = {
      integration: { integrationId: config.id, packageRoot: config.packageRoot },
      artifact,
      host,
      artifactAssets: readonlyFiles(artifactRoot, false) as ReadonlyArtifactAssets,
      target: readonlyFiles(targetScopeRoot, true) as ReadonlyTarget,
    }
    const rawPlan = yield* module.plan(context).pipe(Effect.mapError(error => preludeError('planning', `Harness Module ${config.id} failed`, errorMessage(error))))
    const plan = yield* Effect.try({ try: () => decodeModulePlan(rawPlan), catch: error => preludeError('planning', `Harness Module ${config.id} returned an invalid plan`, errorMessage(error)) })
    return { config, artifactRoot, artifact, descriptor, plan }
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
