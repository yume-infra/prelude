import type { DecodedCanonicalTreeArchive, TreeDigestEntry } from '@sayoriqwq/prelude-contract'
import { canonicalTreeDigest, isSafeRelativeSymlink, SYMBOLIC_LINK_MODE } from '@sayoriqwq/prelude-contract'
import { Effect, FileSystem, Option, Path, Schema } from 'effect'
import { errorMessage, preludeError, PreludeError } from './errors.js'
import { sha256 } from './model.js'

export interface TreeSnapshot {
  readonly rootKind: 'missing' | 'directory' | 'file'
  readonly entries: ReadonlyArray<TreeDigestEntry>
  readonly digest: string
}

function platformFailure(phase: PreludeError['phase'], message: string) {
  return (error: unknown) => preludeError(phase, message, errorMessage(error))
}

interface NoFollowInfo {
  readonly size: number
  readonly isFile: () => boolean
  readonly isDirectory: () => boolean
  readonly isSymbolicLink: () => boolean
}

function platformErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('reason' in error))
    return undefined
  const reason = error.reason
  if (typeof reason !== 'object' || reason === null || !('cause' in reason))
    return undefined
  const cause = reason.cause
  return typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string'
    ? cause.code
    : undefined
}

function fromFileInfo(info: FileSystem.File.Info): NoFollowInfo {
  return {
    size: Number(info.size),
    isFile: () => info.type === 'File',
    isDirectory: () => info.type === 'Directory',
    isSymbolicLink: () => false,
  }
}

const symbolicLinkInfo: NoFollowInfo = {
  size: 0,
  isFile: () => false,
  isDirectory: () => false,
  isSymbolicLink: () => true,
}

function inspectNoFollow(fs: FileSystem.FileSystem, absolutePath: string) {
  return fs.readLink(absolutePath).pipe(
    Effect.as(symbolicLinkInfo),
    Effect.catch(error => platformErrorCode(error) === 'EINVAL'
      ? fs.stat(absolutePath).pipe(Effect.map(fromFileInfo))
      : Effect.fail(error)),
  )
}

export function noFollowStat(
  absolutePath: string,
  phase: PreludeError['phase'],
): Effect.Effect<NoFollowInfo, PreludeError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return yield* inspectNoFollow(fs, absolutePath).pipe(
      Effect.mapError(error => preludeError(phase, 'Cannot inspect tree entry without following symbolic links', errorMessage(error))),
    )
  })
}

export function noFollowEntryKind(
  absolutePath: string,
  phase: PreludeError['phase'],
): Effect.Effect<'file' | 'directory' | 'symbolicLink' | 'other', PreludeError, FileSystem.FileSystem> {
  return noFollowStat(absolutePath, phase).pipe(Effect.map(info => (
    info.isFile()
      ? 'file'
      : info.isDirectory()
        ? 'directory'
        : info.isSymbolicLink()
          ? 'symbolicLink'
          : 'other'
  )))
}

function noFollowStatOptional(
  absolutePath: string,
  phase: PreludeError['phase'],
): Effect.Effect<NoFollowInfo | undefined, PreludeError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return yield* inspectNoFollow(fs, absolutePath).pipe(
      Effect.catch(error => platformErrorCode(error) === 'ENOENT'
        ? Effect.sync(() => undefined)
        : Effect.fail(preludeError(phase, 'Cannot inspect tree root without following symbolic links', error.message))),
    )
  })
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
      return yield* preludeError(phase, 'Path escapes its confined root', relative)
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
      return yield* preludeError(phase, 'Path escapes its confined root', absolutePath)

    const relative = path.relative(root, absolutePath)
    const segments = relative === '' ? [] : relative.split(path.sep)
    const realRoot = yield* fs.realPath(root).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve confined root')))
    let current = root
    let expectedReal = realRoot
    for (const segment of segments) {
      current = path.join(current, segment)
      expectedReal = path.join(expectedReal, segment)
      const noFollowInfo = yield* noFollowStatOptional(current, phase)
      if (noFollowInfo === undefined)
        break
      if (noFollowInfo.isSymbolicLink())
        return yield* preludeError(phase, 'Symbolic links are unsupported in confined paths', current)
      const realCurrent = yield* fs.realPath(current).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve path')))
      if (realCurrent !== expectedReal)
        return yield* preludeError(phase, 'Symbolic links are unsupported in confined paths', current)
    }
  })
}

export function assertTargetWritePath(controlRoot: string, absolutePath: string): Effect.Effect<void, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    if (!isWithin(path, controlRoot, absolutePath))
      return yield* preludeError('planning', 'Target path escapes the Control Root', absolutePath)
    yield* assertNoSymlinkSegments(controlRoot, absolutePath, 'planning')
    if (yield* fs.exists(absolutePath)) {
      const info = yield* fs.stat(absolutePath).pipe(Effect.mapError(platformFailure('planning', 'Cannot inspect managed Target surface')))
      if (info.type === 'File' && Option.getOrElse(info.nlink, () => 1) > 1)
        return yield* preludeError('planning', 'Hard links are unsupported in Target surfaces', absolutePath)
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
    return Effect.fail(preludeError(phase, 'Symbolic links are unsupported in trees', absolutePath))

  if (info.type !== 'File' && info.type !== 'Directory')
    return Effect.fail(preludeError(phase, 'Special files are unsupported in trees', absolutePath))

  if (!allowHardLinks && info.type === 'File' && Option.getOrElse(info.nlink, () => 1) > 1)
    return Effect.fail(preludeError(phase, 'Hard links are unsupported in trees', absolutePath))

  return Effect.void
}

export function scanTree(
  absoluteRoot: string,
  phase: PreludeError['phase'],
  options: { readonly allowHardLinks?: boolean, readonly allowSafeSymlinks?: boolean } = {},
): Effect.Effect<TreeSnapshot, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const rootNoFollowInfo = yield* noFollowStatOptional(absoluteRoot, phase)
    if (rootNoFollowInfo === undefined) {
      const entries: ReadonlyArray<TreeDigestEntry> = []
      return { rootKind: 'missing', entries, digest: canonicalTreeDigest({ rootKind: 'missing', entries }) }
    }

    if (rootNoFollowInfo.isSymbolicLink())
      return yield* preludeError(phase, 'Tree roots cannot be symbolic links', absoluteRoot)
    const realRoot = yield* fs.realPath(absoluteRoot).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve tree')))
    const realParent = yield* fs.realPath(path.dirname(absoluteRoot)).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve tree parent')))
    if (realRoot !== path.join(realParent, path.basename(absoluteRoot)))
      return yield* preludeError(phase, 'Symbolic links are unsupported in trees', absoluteRoot)
    const rootInfo = yield* fs.stat(absoluteRoot).pipe(Effect.mapError(platformFailure(phase, 'Cannot inspect tree')))
    yield* assertSupportedInfo(absoluteRoot, rootInfo, phase, options.allowHardLinks ?? false)
    if (rootInfo.type === 'File') {
      const content = yield* fs.readFile(absoluteRoot).pipe(Effect.mapError(platformFailure(phase, 'Cannot read tree file')))
      const entries: ReadonlyArray<TreeDigestEntry> = [{
        path: '.',
        kind: 'file',
        mode: entryMode(rootInfo),
        hash: sha256(content),
      }]
      return { rootKind: 'file', entries, digest: canonicalTreeDigest({ rootKind: 'file', entries }) }
    }

    const entries: Array<TreeDigestEntry> = []
    const visit = (directory: string, relativeDirectory: string): Effect.Effect<void, PreludeError, FileSystem.FileSystem> => Effect.gen(function* () {
      const names = yield* fs.readDirectory(directory).pipe(
        Effect.mapError(platformFailure(phase, 'Cannot read tree directory')),
      )
      names.sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
      for (const name of names) {
        const absolute = path.join(directory, name)
        const relative = relativeDirectory === '.' ? name : `${relativeDirectory}/${name}`
        const noFollowInfo = yield* noFollowStat(absolute, phase)
        if (noFollowInfo.isSymbolicLink()) {
          if (options.allowSafeSymlinks !== true)
            return yield* preludeError(phase, 'Symbolic links are unsupported in ManagedTree', absolute)
          const linkTarget = yield* fs.readLink(absolute).pipe(
            Effect.mapError(platformFailure(phase, 'Cannot read tree symbolic link')),
          )
          if (!isSafeRelativeSymlink(relative, linkTarget))
            return yield* preludeError(phase, 'PinnedReferenceTree symbolic link escapes its complete tree', `${relative} -> ${linkTarget}`)
          entries.push({ path: relative, kind: 'symbolicLink', mode: SYMBOLIC_LINK_MODE, target: linkTarget })
          continue
        }
        const info = yield* fs.stat(absolute).pipe(Effect.mapError(platformFailure(phase, 'Cannot inspect tree entry')))
        const realEntry = yield* fs.realPath(absolute).pipe(Effect.mapError(platformFailure(phase, 'Cannot resolve tree entry')))
        if (realEntry !== path.join(realRoot, ...relative.split('/')))
          return yield* preludeError(phase, 'Tree entry resolves outside its complete tree', absolute)
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
      digest: canonicalTreeDigest({ rootKind: 'directory', entries }),
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

const safeOperationId = (operationId: string) => operationId.slice(0, 12).replaceAll(/[^\w.-]/g, '_')

export function publishFile(
  absolutePath: string,
  content: string,
  operationId: string,
): Effect.Effect<void, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const parent = path.dirname(absolutePath)
    const staged = path.join(parent, `.${path.basename(absolutePath)}.prelude-stage-${safeOperationId(operationId)}`)
    yield* fs.makeDirectory(parent, { recursive: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot create output directory')))
    yield* Effect.addFinalizer(() => fs.remove(staged, { force: true }).pipe(Effect.ignore))
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
    const staged = path.join(parent, `.${path.basename(targetPath)}.prelude-stage-${safeOperationId(operationId)}`)
    const previous = path.join(parent, `.${path.basename(targetPath)}.prelude-previous-${safeOperationId(operationId)}`)
    yield* fs.makeDirectory(parent, { recursive: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot create tree parent')))
    yield* Effect.addFinalizer(() => fs.remove(staged, { recursive: true, force: true }).pipe(Effect.ignore))
    yield* fs.remove(staged, { recursive: true, force: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot clean staged tree')))
    yield* fs.remove(previous, { recursive: true, force: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot clean previous tree staging')))
    yield* fs.copy(sourcePath, staged, { overwrite: true, preserveTimestamps: false }).pipe(
      Effect.mapError(platformFailure('apply', 'Cannot stage ManagedTree')),
    )
    const stagedSnapshot = yield* scanTree(staged, 'apply')
    if (stagedSnapshot.digest !== expectedDigest)
      return yield* preludeError('apply', 'Staged tree digest does not match approved desired state', `${stagedSnapshot.digest} != ${expectedDigest}`)
    const hadTarget = yield* fs.exists(targetPath).pipe(Effect.mapError(platformFailure('apply', 'Cannot inspect existing tree')))
    if (hadTarget)
      yield* fs.rename(targetPath, previous).pipe(Effect.mapError(platformFailure('apply', 'Cannot stage previous complete tree')))
    yield* fs.rename(staged, targetPath).pipe(
      Effect.catch(error => hadTarget
        ? fs.rename(previous, targetPath).pipe(
            Effect.mapError(restoreError => preludeError('apply', 'Cannot restore previous complete tree', `${errorMessage(error)}; restore: ${errorMessage(restoreError)}`)),
            Effect.andThen(Effect.fail(error)),
          )
        : Effect.fail(error)),
      Effect.mapError(platformFailure('apply', 'Cannot publish complete tree')),
    )
    if (hadTarget)
      yield* fs.remove(previous, { recursive: true, force: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot clean replaced tree')))
  }))
}

export function replaceTreeFromArchive(
  archive: DecodedCanonicalTreeArchive,
  targetPath: string,
  operationId: string,
  expectedDigest: string,
): Effect.Effect<void, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const parent = path.dirname(targetPath)
    const staged = path.join(parent, `.${path.basename(targetPath)}.prelude-stage-${safeOperationId(operationId)}`)
    const previous = path.join(parent, `.${path.basename(targetPath)}.prelude-previous-${safeOperationId(operationId)}`)

    if (archive.treeDigest !== expectedDigest)
      return yield* preludeError('apply', 'Decoded archive digest does not match approved desired state', `${archive.treeDigest} != ${expectedDigest}`)

    yield* fs.makeDirectory(parent, { recursive: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot create tree parent')))
    yield* Effect.addFinalizer(() => fs.remove(staged, { recursive: true, force: true }).pipe(Effect.ignore))
    yield* fs.remove(staged, { recursive: true, force: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot clean staged tree')))
    yield* fs.remove(previous, { recursive: true, force: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot clean previous tree staging')))
    yield* fs.makeDirectory(staged).pipe(Effect.mapError(platformFailure('apply', 'Cannot stage PinnedReferenceTree root')))

    const directories: Array<{ readonly path: string, readonly mode: number }> = []
    for (const entry of archive.entries) {
      const stagedEntry = path.join(staged, ...entry.path.split('/'))
      if (entry.kind === 'directory') {
        yield* fs.makeDirectory(stagedEntry).pipe(Effect.mapError(platformFailure('apply', 'Cannot stage PinnedReferenceTree directory')))
        directories.push({ path: stagedEntry, mode: entry.mode })
      }
      else if (entry.kind === 'file') {
        yield* fs.writeFile(stagedEntry, entry.bytes).pipe(Effect.mapError(platformFailure('apply', 'Cannot stage PinnedReferenceTree file')))
        yield* fs.chmod(stagedEntry, entry.mode).pipe(Effect.mapError(platformFailure('apply', 'Cannot preserve PinnedReferenceTree file mode')))
      }
      else {
        yield* fs.symlink(entry.target, stagedEntry).pipe(Effect.mapError(platformFailure('apply', 'Cannot preserve PinnedReferenceTree symbolic link')))
      }
    }
    for (const directory of directories.reverse())
      yield* fs.chmod(directory.path, directory.mode).pipe(Effect.mapError(platformFailure('apply', 'Cannot preserve PinnedReferenceTree directory mode')))

    const stagedSnapshot = yield* scanTree(staged, 'apply', { allowSafeSymlinks: true })
    if (stagedSnapshot.digest !== expectedDigest)
      return yield* preludeError('apply', 'Staged archive tree digest does not match approved desired state', `${stagedSnapshot.digest} != ${expectedDigest}`)

    const hadTarget = yield* fs.exists(targetPath).pipe(Effect.mapError(platformFailure('apply', 'Cannot inspect existing tree')))
    if (hadTarget)
      yield* fs.rename(targetPath, previous).pipe(Effect.mapError(platformFailure('apply', 'Cannot stage previous complete tree')))
    yield* fs.rename(staged, targetPath).pipe(
      Effect.catch(error => hadTarget
        ? fs.rename(previous, targetPath).pipe(
            Effect.mapError(restoreError => preludeError('apply', 'Cannot restore previous complete tree', `${errorMessage(error)}; restore: ${errorMessage(restoreError)}`)),
            Effect.andThen(Effect.fail(error)),
          )
        : Effect.fail(error)),
      Effect.mapError(platformFailure('apply', 'Cannot publish complete tree')),
    )
    if (hadTarget)
      yield* fs.remove(previous, { recursive: true, force: true }).pipe(Effect.mapError(platformFailure('apply', 'Cannot clean replaced tree')))
  }))
}
