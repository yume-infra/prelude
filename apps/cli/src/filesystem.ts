import { Effect, FileSystem, Option, Path, Schema } from 'effect'
import { errorMessage, preludeError, PreludeError } from './errors.js'
import { sha256, stableJson } from './model.js'

interface TreeEntry {
  readonly path: string
  readonly kind: 'directory' | 'file'
  readonly mode: number
  readonly hash?: string
}

export interface TreeSnapshot {
  readonly rootKind: 'missing' | 'directory' | 'file'
  readonly entries: ReadonlyArray<TreeEntry>
  readonly digest: string
}

function platformFailure(phase: PreludeError['phase'], message: string) {
  return (error: unknown) => preludeError(phase, message, errorMessage(error))
}

function isWithin(path: Path.Path, root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

export function resolveWithin(
  root: string,
  relative: string,
  phase: PreludeError['phase'],
): Effect.Effect<string, PreludeError, Path.Path> {
  return Effect.gen(function* () {
    const path = yield* Path.Path
    const resolved = relative === '.' ? root : path.resolve(root, relative)
    if (!isWithin(path, root, resolved))
      return yield* Effect.fail(preludeError(phase, 'Path escapes its confined root', relative))
    return resolved
  })
}

export function assertNoSymlinkSegments(
  root: string,
  absolutePath: string,
  phase: PreludeError['phase'],
): Effect.Effect<void, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    if (!isWithin(path, root, absolutePath))
      return yield* Effect.fail(preludeError(phase, 'Path escapes its confined root', absolutePath))

    const relative = path.relative(root, absolutePath)
    const segments = relative === '' ? [] : relative.split(path.sep)
    const realRoot = yield* fs.realPath(root).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve confined root')))
    let current = root
    let expectedReal = realRoot
    for (const segment of segments) {
      current = path.join(current, segment)
      expectedReal = path.join(expectedReal, segment)
      if (!(yield* fs.exists(current).pipe(Effect.mapError(platformFailure(phase, 'Cannot inspect path')))))
        break
      const realCurrent = yield* fs.realPath(current).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve path')))
      if (realCurrent !== expectedReal)
        return yield* Effect.fail(preludeError(phase, 'Symbolic links are unsupported in V1', current))
      const info = yield* fs.stat(current).pipe(Effect.mapError(platformFailure(phase, 'Cannot inspect path')))
      if (info.type === 'SymbolicLink')
        return yield* Effect.fail(preludeError(phase, 'Symbolic links are unsupported in V1', current))
    }
  })
}

export function assertTargetWritePath(controlRoot: string, absolutePath: string): Effect.Effect<void, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    if (!isWithin(path, controlRoot, absolutePath))
      return yield* Effect.fail(preludeError('planning', 'Target path escapes the Control Root', absolutePath))
    yield* assertNoSymlinkSegments(controlRoot, absolutePath, 'planning')
    if (yield* fs.exists(absolutePath)) {
      const info = yield* fs.stat(absolutePath).pipe(Effect.mapError(platformFailure('planning', 'Cannot inspect managed Target surface')))
      if (info.type === 'File' && Option.getOrElse(info.nlink, () => 1) > 1)
        return yield* Effect.fail(preludeError('planning', 'Hard links are unsupported in V1 Target surfaces', absolutePath))
    }
  }).pipe(Effect.mapError(error => Schema.is(PreludeError)(error) ? error : preludeError('planning', 'Cannot inspect Target write path', errorMessage(error))))
}

function entryMode(info: FileSystem.File.Info): number {
  return info.mode & 0o777
}

function assertSupportedInfo(
  absolutePath: string,
  info: FileSystem.File.Info,
  phase: PreludeError['phase'],
  allowHardLinks: boolean,
): Effect.Effect<void, PreludeError> {
  if (info.type === 'SymbolicLink')
    return Effect.fail(preludeError(phase, 'Symbolic links are unsupported in V1', absolutePath))

  if (info.type !== 'File' && info.type !== 'Directory')
    return Effect.fail(preludeError(phase, 'Special files are unsupported in V1', absolutePath))

  if (!allowHardLinks && info.type === 'File' && Option.getOrElse(info.nlink, () => 1) > 1)
    return Effect.fail(preludeError(phase, 'Hard links are unsupported in V1', absolutePath))

  return Effect.void
}

export function scanTree(
  absoluteRoot: string,
  phase: PreludeError['phase'],
  options: { readonly allowHardLinks?: boolean } = {},
): Effect.Effect<TreeSnapshot, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const exists = yield* fs.exists(absoluteRoot).pipe(Effect.mapError(platformFailure(phase, 'Cannot inspect tree')))
    if (!exists) {
      const entries: ReadonlyArray<TreeEntry> = []
      return { rootKind: 'missing', entries, digest: sha256(stableJson({ rootKind: 'missing', entries })) }
    }

    const realRoot = yield* fs.realPath(absoluteRoot).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve tree')))
    const realParent = yield* fs.realPath(path.dirname(absoluteRoot)).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve tree parent')))
    if (realRoot !== path.join(realParent, path.basename(absoluteRoot)))
      return yield* Effect.fail(preludeError(phase, 'Symbolic links are unsupported in V1', absoluteRoot))
    const rootInfo = yield* fs.stat(absoluteRoot).pipe(Effect.mapError(platformFailure(phase, 'Cannot inspect tree')))
    yield* assertSupportedInfo(absoluteRoot, rootInfo, phase, options.allowHardLinks ?? false)
    if (rootInfo.type === 'File') {
      const content = yield* fs.readFile(absoluteRoot).pipe(Effect.mapError(platformFailure(phase, 'Cannot read tree file')))
      const entries: ReadonlyArray<TreeEntry> = [{
        path: '.',
        kind: 'file',
        mode: entryMode(rootInfo),
        hash: sha256(content),
      }]
      return { rootKind: 'file', entries, digest: sha256(stableJson({ rootKind: 'file', entries })) }
    }

    const entries: Array<TreeEntry> = []
    const visit = (directory: string, relativeDirectory: string): Effect.Effect<void, PreludeError> => Effect.gen(function* () {
      const names = yield* fs.readDirectory(directory).pipe(
        Effect.mapError(platformFailure(phase, 'Cannot read tree directory')),
      )
      names.sort((left, right) => left.localeCompare(right))
      for (const name of names) {
        if (relativeDirectory === '.' && name === 'node_modules')
          continue
        const absolute = path.join(directory, name)
        const relative = relativeDirectory === '.' ? name : `${relativeDirectory}/${name}`
        const realEntry = yield* fs.realPath(absolute).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve tree entry')))
        if (realEntry !== path.join(realRoot, ...relative.split('/')))
          return yield* Effect.fail(preludeError(phase, 'Symbolic links are unsupported in V1', absolute))
        const info = yield* fs.stat(absolute).pipe(Effect.mapError(platformFailure(phase, 'Cannot inspect tree entry')))
        yield* assertSupportedInfo(absolute, info, phase, options.allowHardLinks ?? false)
        if (info.type === 'Directory') {
          entries.push({ path: relative, kind: 'directory', mode: entryMode(info) })
          yield* visit(absolute, relative)
        }
        else {
          const content = yield* fs.readFile(absolute).pipe(Effect.mapError(platformFailure(phase, 'Cannot read tree entry')))
          entries.push({ path: relative, kind: 'file', mode: entryMode(info), hash: sha256(content) })
        }
      }
    })

    yield* visit(absoluteRoot, '.')
    return {
      rootKind: 'directory',
      entries,
      digest: sha256(stableJson({ rootKind: 'directory', entries })),
    }
  })
}

export function readOptionalText(
  absolutePath: string,
  phase: PreludeError['phase'],
): Effect.Effect<string | undefined, PreludeError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const exists = yield* fs.exists(absolutePath).pipe(Effect.mapError(platformFailure(phase, 'Cannot inspect file')))
    if (!exists)
      return undefined
    return yield* fs.readFileString(absolutePath).pipe(Effect.mapError(platformFailure(phase, 'Cannot read file')))
  })
}

export function publishFile(
  absolutePath: string,
  content: string,
  operationId: string,
): Effect.Effect<void, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const parent = path.dirname(absolutePath)
    const staged = path.join(parent, `.${path.basename(absolutePath)}.prelude-stage-${operationId.slice(0, 12)}`)
    yield* fs.makeDirectory(parent, { recursive: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot create output directory')))
    yield* Effect.addFinalizer(() => fs.remove(staged, { force: true }).pipe(Effect.catch(() => Effect.void)))
    yield* fs.remove(staged, { force: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot clean staged file')))
    yield* fs.writeFileString(staged, content).pipe(Effect.mapError(platformFailure('apply', 'Cannot stage output file')))
    yield* fs.rename(staged, absolutePath).pipe(Effect.mapError(platformFailure('apply', 'Cannot publish output file')))
  }))
}

export function replaceTree(
  sourcePath: string,
  targetPath: string,
  operationId: string,
  expectedDigest: string,
): Effect.Effect<void, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const parent = path.dirname(targetPath)
    const staged = path.join(parent, `.${path.basename(targetPath)}.prelude-stage-${operationId.slice(0, 12)}`)
    yield* fs.makeDirectory(parent, { recursive: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot create tree parent')))
    yield* Effect.addFinalizer(() => fs.remove(staged, { recursive: true, force: true }).pipe(Effect.catch(() => Effect.void)))
    yield* fs.remove(staged, { recursive: true, force: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot clean staged tree')))
    yield* fs.copy(sourcePath, staged, { overwrite: true, preserveTimestamps: false }).pipe(
      Effect.mapError(platformFailure('apply', 'Cannot stage managed tree')),
    )
    const stagedSnapshot = yield* scanTree(staged, 'apply')
    if (stagedSnapshot.digest !== expectedDigest)
      return yield* Effect.fail(preludeError('apply', 'Staged ManagedTree digest does not match approved desired state', `${stagedSnapshot.digest} != ${expectedDigest}`))
    yield* fs.remove(targetPath, { recursive: true, force: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot replace managed tree')))
    yield* fs.rename(staged, targetPath).pipe(Effect.mapError(platformFailure('apply', 'Cannot publish managed tree')))
  }))
}
