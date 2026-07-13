/* eslint-disable style/max-statements-per-line */
import type { Check, DecodedCanonicalTreeArchive, JsonKeyedItem, JsonValue, ManagedBlock, Output, OutputLocator, PackageRequirement, PinnedReferenceTree } from '@sayoriqwq/prelude-contract'
import type { PreludeError } from './errors.js'
import type { ApplyOperation, Conflict, FileOperation, IntegrationPlan, OwnedCheck, OwnedIssue, Owner, PlannedConvergence, PlannedOutput, RequirementResult, TreeOperation } from './model.js'
import type { LoadedIntegration } from './module-loader.js'

import { CANONICAL_TREE_ARCHIVE_LIMITS, decodeCanonicalTreeArchive } from '@sayoriqwq/prelude-contract'
import { Effect, FileSystem, Path } from 'effect'
import { applyEdits, findNodeAtLocation, getNodePath, modify, parse, parseTree, visit } from 'jsonc-parser'
import semver from 'semver'
import { compareLockSelection, evaluateRequirementSelection, inspectLockSelection, linkedSelectionPath } from './artifact-selection.js'
import { discoverControlRoot, loadPreludeConfig } from './config.js'
import { errorMessage, preludeError } from './errors.js'
import { assertNoSymlinkSegments, assertTargetWritePath, noFollowStat, readOptionalText, resolveWithin, scanTree } from './filesystem.js'
import { compareText, EXECUTION_HASH_VERSION, executionHash, ownerKey, PLAN_SCHEMA_VERSION, sha256, stableJson } from './model.js'
import { loadIntegration } from './module-loader.js'

interface OwnedOutput { readonly owner: Owner, readonly declaration: Output, readonly integration: LoadedIntegration, readonly targetPath: string, readonly resolvedPath: string }
interface FileState { source: string, desired: string, owners: Array<Owner> }

const compareOwner = (a: Owner, b: Owner) => compareText(ownerKey(a), ownerKey(b))
const pointerParts = (pointer: string) => pointer === '' ? [] : pointer.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))
const pathOverlap = (left: string, right: string) => left === '' || right === '' || left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
const isTree = (output: Output): output is Extract<Output, { readonly kind: 'ManagedTree' | 'PinnedReferenceTree' }> => output.kind === 'ManagedTree' || output.kind === 'PinnedReferenceTree'
function pointerOverlap(left: string, right: string) { const a = pointerParts(left); const b = pointerParts(right); const n = Math.min(a.length, b.length); return a.slice(0, n).every((part, index) => part === b[index]) }

function blockMarkers(blockId: string) { return { start: `<!-- prelude:${blockId}:start -->`, end: `<!-- prelude:${blockId}:end -->` } }
function applyBlock(source: string, block: ManagedBlock): string {
  const { start, end } = blockMarkers(block.blockId); const startAt = source.indexOf(start); const endAt = source.indexOf(end)
  if ((startAt < 0) !== (endAt < 0) || source.includes(start, startAt + 1) || source.includes(end, endAt + 1) || (startAt >= 0 && endAt < startAt))
    throw new Error(`invalid or duplicate markers for ${block.blockId}`)
  const body = `${start}\n${block.content.replace(/\n+$/, '')}\n${end}`
  return startAt < 0 ? `${source.replace(/\s*$/, '')}${source.trim() === '' ? '' : '\n\n'}${body}\n` : `${source.slice(0, startAt)}${body}${source.slice(endAt + end.length)}`
}

function assertJson(source: string, path: string): unknown {
  const errors: Array<{ error: number, offset: number, length: number }> = []; const value = parse(source, errors, { allowTrailingComma: true, disallowComments: false })
  if (errors.length > 0)
    throw new Error(`${path} contains invalid JSONC`)
  let duplicate: string | undefined
  visit(source, { onObjectProperty: (_property, offset) => { const tree = parseTree(source, [], { allowTrailingComma: true, disallowComments: false }); const node = tree === undefined ? undefined : findNodeAtLocation(tree, getNodePath({ type: 'property', offset, length: 0, parent: undefined, children: undefined } as never)); void node } }, { allowTrailingComma: true, disallowComments: false })
  const detect = (node: ReturnType<typeof parseTree>, prefix = ''): void => {
    if (node?.type === 'object') {
      const local = new Set<string>(); for (const property of node.children ?? []) {
        const key = String(property.children?.[0]?.value); if (local.has(key))
          duplicate = `${prefix}/${key}`; local.add(key); detect(property.children?.[1], `${prefix}/${key}`)
      }
    }
    else {
      for (const child of node?.children ?? []) detect(child, prefix)
    }
  }
  detect(parseTree(source, [], { allowTrailingComma: true, disallowComments: false })); if (duplicate !== undefined)
    throw new Error(`${path} contains duplicate key ${duplicate}`); return value
}

export function applyJsonOutput(source: string, output: JsonValue | JsonKeyedItem, path: string): string {
  const root = assertJson(source, path); const formattingOptions = { insertSpaces: true, tabSize: 2, eol: source.includes('\r\n') ? '\r\n' : '\n' }
  if (output.kind === 'JsonValue')
    return applyEdits(source, modify(source, pointerParts(output.pointer), output.value, { formattingOptions }))
  const collectionPath = pointerParts(output.collectionPointer); const current = collectionPath.reduce<unknown>((value, key) => value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, root)
  if (current !== undefined && !Array.isArray(current))
    throw new Error(`${path}${output.collectionPointer} is not an array`)
  const items = (current ?? []) as Array<unknown>; const matches = items.flatMap((item, index) => item !== null && typeof item === 'object' && (item as Record<string, unknown>)[output.keyField] === output.keyValue ? [index] : [])
  if (matches.length > 1)
    throw new Error(`${path}${output.collectionPointer} contains duplicate keyed items`)
  if (matches[0] !== undefined) {
    const itemPath = [...collectionPath, matches[0]]
    const updateObject = (text: string, location: Array<string | number>, before: unknown, desired: unknown): string => {
      if (before === null || desired === null || typeof before !== 'object' || typeof desired !== 'object' || Array.isArray(before) || Array.isArray(desired))
        return Object.is(before, desired) ? text : applyEdits(text, modify(text, location, desired, { formattingOptions }))
      const previous = before as Record<string, unknown>; const next = desired as Record<string, unknown>
      for (const key of Object.keys(previous).filter(key => !(key in next))) text = applyEdits(text, modify(text, [...location, key], undefined, { formattingOptions }))
      for (const [key, value] of Object.entries(next)) text = key in previous ? updateObject(text, [...location, key], previous[key], value) : applyEdits(text, modify(text, [...location, key], value, { formattingOptions }))
      return text
    }
    return updateObject(source, itemPath, items[matches[0]], output.item)
  }
  return applyEdits(source, modify(source, [...collectionPath, -1], output.item, { formattingOptions, isArrayInsertion: true }))
}

export function detectOutputConflicts(declarations: ReadonlyArray<Output>): ReadonlyArray<{ readonly kind: Conflict['kind'] }> {
  const conflicts: Array<{ readonly kind: Conflict['kind'] }> = []
  for (let index = 0; index < declarations.length; index++) {
    for (let otherIndex = index + 1; otherIndex < declarations.length; otherIndex++) {
      const left = declarations[index]!; const right = declarations[otherIndex]!
      if (isTree(left) || isTree(right) || stableJson(left.locator) !== stableJson(right.locator))
        continue
      if (left.kind === 'JsonValue' && right.kind === 'JsonValue' && pointerOverlap(left.pointer, right.pointer))
        conflicts.push({ kind: 'jsonPointerOverlap' })
      else if (left.kind === 'JsonKeyedItem' && right.kind === 'JsonKeyedItem' && pointerOverlap(left.collectionPointer, right.collectionPointer))
        conflicts.push({ kind: left.collectionPointer === right.collectionPointer && left.keyField === right.keyField && left.keyValue === right.keyValue ? 'jsonKeyIdentity' : 'jsonPointerOverlap' })
      else if (left.kind === 'JsonValue' && right.kind === 'JsonKeyedItem' && pointerOverlap(left.pointer, right.collectionPointer))
        conflicts.push({ kind: 'jsonPointerOverlap' })
      else if (left.kind === 'JsonKeyedItem' && right.kind === 'JsonValue' && pointerOverlap(left.collectionPointer, right.pointer))
        conflicts.push({ kind: 'jsonPointerOverlap' })
    }
  }
  return conflicts
}

export function outputOverlapsFeedbackZone(
  resolvedPath: string,
  integrationWorkspaces: ReadonlyArray<string>,
): boolean {
  return integrationWorkspaces.some(workspace => pathOverlap(resolvedPath, `${workspace}/feedback`))
}

function resolveOutputLocator(controlRoot: string, integration: LoadedIntegration, locator: OutputLocator): Effect.Effect<{ readonly targetPath: string, readonly resolvedPath: string }, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const path = yield* Path.Path
    if (locator.root === 'PackageRoot' && !integration.config.packageRoots.includes(locator.packageRoot))
      return yield* Effect.fail(preludeError('planning', 'Output Package Root is not approved for this Integration', locator.packageRoot))
    const baseRelative = locator.root === 'ControlRoot' ? '.' : locator.root === 'IntegrationWorkspace' ? integration.integrationWorkspace : locator.packageRoot
    const base = yield* resolveWithin(controlRoot, baseRelative, 'planning'); const targetPath = yield* resolveWithin(base, locator.path, 'planning'); yield* assertTargetWritePath(controlRoot, targetPath)
    const relative = path.relative(controlRoot, targetPath); const resolvedPath = relative.split(path.sep).join('/')
    return { targetPath, resolvedPath }
  })
}

export function loadPinnedReferenceTreeArchive(
  artifactRoot: string,
  declaration: PinnedReferenceTree,
): Effect.Effect<DecodedCanonicalTreeArchive, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const archivePath = yield* resolveWithin(artifactRoot, declaration.archive.path, 'planning')
    yield* assertNoSymlinkSegments(artifactRoot, archivePath, 'planning')
    const archiveInfo = yield* noFollowStat(archivePath, 'planning')
    if (!archiveInfo.isFile())
      return yield* Effect.fail(preludeError('planning', `PinnedReferenceTree ${declaration.id} archive must be an ordinary Artifact file`, archivePath))
    if (archiveInfo.size > CANONICAL_TREE_ARCHIVE_LIMITS.maxArchiveBytes)
      return yield* Effect.fail(preludeError('planning', `PinnedReferenceTree ${declaration.id} archive exceeds the protocol size limit`, String(archiveInfo.size)))

    const bytes = yield* fs.readFile(archivePath).pipe(
      Effect.mapError(error => preludeError('planning', `Cannot read PinnedReferenceTree ${declaration.id} archive`, errorMessage(error))),
    )
    const archive = yield* Effect.try({
      try: () => decodeCanonicalTreeArchive(bytes),
      catch: error => preludeError('planning', `Cannot decode PinnedReferenceTree ${declaration.id} archive`, errorMessage(error)),
    })

    if (archive.format !== declaration.archive.format)
      return yield* Effect.fail(preludeError('planning', `PinnedReferenceTree ${declaration.id} archive format does not match its declaration`, `${archive.format} != ${declaration.archive.format}`))
    if (archive.treeDigest !== declaration.provenance.treeDigest)
      return yield* Effect.fail(preludeError('planning', `PinnedReferenceTree ${declaration.id} archive does not match packed provenance`, `${archive.treeDigest} != ${declaration.provenance.treeDigest}`))

    return archive
  })
}

function findInstalledPackage(
  controlRoot: string,
  importer: string,
  packageName: string,
): Effect.Effect<{ readonly root: string, readonly manifestSource: string } | undefined, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const path = yield* Path.Path
    let current = importer
    while (true) {
      const root = path.join(current, 'node_modules', packageName)
      const manifestSource = yield* readOptionalText(path.join(root, 'package.json'), 'planning')
      if (manifestSource !== undefined)
        return { root, manifestSource }
      if (current === controlRoot)
        return undefined
      const parent = path.dirname(current)
      if (parent === current || path.relative(controlRoot, parent).startsWith('..'))
        return undefined
      current = parent
    }
  })
}

function requirementResult(controlRoot: string, owner: Owner, requirement: PackageRequirement): Effect.Effect<RequirementResult, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem; const path = yield* Path.Path; const importer = requirement.packageRoot === '.' ? controlRoot : path.join(controlRoot, requirement.packageRoot)
    const manifestSource = yield* fs.readFileString(path.join(importer, 'package.json')); const manifest = JSON.parse(manifestSource) as Record<string, Record<string, string> | undefined>; const directDeclaration = manifest[requirement.section]?.[requirement.packageName]
    const lockSource = yield* fs.readFileString(path.join(controlRoot, 'pnpm-lock.yaml')); const selected = inspectLockSelection({ lockSource, importer: requirement.packageRoot, section: requirement.section, packageName: requirement.packageName })
    const selectedVersionMatches = selected.selectedVersion === undefined || semver.satisfies(selected.selectedVersion, requirement.range)
    const selectionSatisfied = directDeclaration !== undefined && selected.version !== undefined && (selected.specifier ?? directDeclaration) === directDeclaration && selectedVersionMatches
    const installedLockSource = yield* readOptionalText(path.join(controlRoot, 'node_modules/.pnpm/lock.yaml'), 'planning'); let installedVersion: string | undefined; let installedName: string | undefined
    const installedPackage = yield* findInstalledPackage(controlRoot, importer, requirement.packageName)
    if (installedPackage !== undefined) {
      const installed = yield* Effect.try({
        try: () => JSON.parse(installedPackage.manifestSource) as { name?: string, version?: string },
        catch: () => undefined,
      }).pipe(Effect.catch(() => Effect.succeed(undefined)))
      installedVersion = installed?.version
      installedName = installed?.name
    }
    const lockEvidence = installedLockSource === undefined || installedVersion === undefined ? { matches: false as const } : compareLockSelection({ lockSource, installedLockSource, importer: requirement.packageRoot, section: requirement.section, packageName: requirement.packageName, packageVersion: installedVersion })
    let linkedPathMatches = true; const linkedPath = selected.version === undefined ? undefined : linkedSelectionPath(selected.version)
    if (linkedPath !== undefined && installedPackage !== undefined) {
      linkedPathMatches = yield* Effect.all([
        fs.realPath(path.resolve(importer, linkedPath)),
        fs.realPath(installedPackage.root),
      ]).pipe(
        Effect.map(([selectedRealPath, installedRealPath]) => selectedRealPath === installedRealPath),
        Effect.catch(() => Effect.succeed(false)),
      )
    }
    else if (linkedPath !== undefined) {
      linkedPathMatches = false
    }
    const installationSatisfied = selectionSatisfied && evaluateRequirementSelection({ range: requirement.range, packageName: requirement.packageName, installedName, directSpecifier: directDeclaration, lockSpecifier: selected.specifier ?? directDeclaration, lockVersion: selected.version, installedLockVersion: lockEvidence.installedLockVersion, installedVersion, lockIdentityMatches: lockEvidence.matches && linkedPathMatches }).satisfied
    return { owner, declaration: requirement, selectionSatisfied, installationSatisfied, satisfied: selectionSatisfied && installationSatisfied, manifestHash: sha256(manifestSource), lockfileHash: sha256(lockSource), ...(directDeclaration === undefined ? {} : { directDeclaration }), ...(selected.version === undefined ? {} : { lockResolution: selected.version }), ...(installedVersion === undefined ? {} : { installedVersion }), evidence: [!selectionSatisfied ? 'package manifest and lockfile do not contain an Approved Package Selection' : installationSatisfied ? 'Approved Package Selection is installed exactly' : 'Approved Package Selection requires a frozen install'] }
  }).pipe(Effect.mapError(error => preludeError('planning', `Cannot inspect package requirement ${requirement.packageName}`, errorMessage(error))))
}

export function planConvergence(start: string): Effect.Effect<PlannedConvergence, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const controlRoot = yield* discoverControlRoot(start); const config = yield* loadPreludeConfig(controlRoot); const loaded = yield* Effect.forEach(config.integrations, integration => loadIntegration(controlRoot, integration), { concurrency: 1 }); loaded.sort((a, b) => compareText(a.config.id, b.config.id))
    for (const integration of loaded) {
      for (const requirement of integration.plan.requirements) {
        if (!integration.config.packageRoots.includes(requirement.packageRoot))
          return yield* Effect.fail(preludeError('planning', `Requirement ${requirement.id} uses an unapproved Package Root`, requirement.packageRoot)); yield* resolveWithin(controlRoot, requirement.packageRoot, 'planning')
      }
      for (const check of integration.plan.checks) {
        if (!integration.config.packageRoots.includes(check.packageRoot))
          return yield* Effect.fail(preludeError('planning', `Check ${check.id} uses an unapproved Package Root`, check.packageRoot)); yield* resolveWithin(controlRoot, check.packageRoot, 'planning')
      }
    }
    const integrations: Array<IntegrationPlan> = loaded.map(item => ({ integrationId: item.config.id, packageRoots: item.config.packageRoots, integrationWorkspace: item.integrationWorkspace, module: item.config.module, descriptor: item.descriptor, artifact: item.artifact, plan: item.plan }))
    const owned: Array<OwnedOutput> = []
    const integrationWorkspaces = loaded.map(integration => integration.integrationWorkspace)
    for (const integration of loaded) {
      for (const declaration of integration.plan.outputs) {
        const owner = { integrationId: integration.config.id, declarationId: declaration.id }; const resolved = yield* resolveOutputLocator(controlRoot, integration, declaration.locator)
        if (outputOverlapsFeedbackZone(resolved.resolvedPath, integrationWorkspaces))
          return yield* Effect.fail(preludeError('planning', `Output ${declaration.id} overlaps a Target-owned feedback zone`, resolved.resolvedPath))
        owned.push({ owner, declaration, integration, ...resolved })
      }
    }
    owned.sort((a, b) => compareOwner(a.owner, b.owner)); const conflicts: Array<Conflict> = []
    for (let i = 0; i < owned.length; i++) {
      for (let j = i + 1; j < owned.length; j++) {
        const a = owned[i]!; const b = owned[j]!
        if (isTree(a.declaration) || isTree(b.declaration)) {
          if (pathOverlap(a.resolvedPath, b.resolvedPath))
            conflicts.push({ kind: isTree(a.declaration) && isTree(b.declaration) ? 'treeOverlap' : 'treeBoundedOverlap', owners: [a.owner, b.owner], summary: 'Complete tree authority overlaps another Output after root resolution' })
        }
        else if (a.resolvedPath === b.resolvedPath) {
          if (a.declaration.kind === 'ManagedBlock' && b.declaration.kind === 'ManagedBlock' && a.declaration.blockId === b.declaration.blockId)
            conflicts.push({ kind: 'blockIdentity', owners: [a.owner, b.owner], summary: 'Managed block identity is duplicated' })
          else if ((a.declaration.kind === 'ManagedBlock') !== (b.declaration.kind === 'ManagedBlock'))
            conflicts.push({ kind: 'boundedFileKind', owners: [a.owner, b.owner], summary: 'Text block and JSON authority share one physical file' })
          else if (a.declaration.kind === 'JsonValue' && b.declaration.kind === 'JsonValue' && pointerOverlap(a.declaration.pointer, b.declaration.pointer))
            conflicts.push({ kind: 'jsonPointerOverlap', owners: [a.owner, b.owner], summary: 'JSON pointers overlap' })
          else if (a.declaration.kind === 'JsonKeyedItem' && b.declaration.kind === 'JsonKeyedItem' && pointerOverlap(a.declaration.collectionPointer, b.declaration.collectionPointer))
            conflicts.push({ kind: a.declaration.collectionPointer === b.declaration.collectionPointer && a.declaration.keyField === b.declaration.keyField && a.declaration.keyValue === b.declaration.keyValue ? 'jsonKeyIdentity' : 'jsonPointerOverlap', owners: [a.owner, b.owner], summary: 'JSON collection authority overlaps' })
          else if (a.declaration.kind === 'JsonValue' && b.declaration.kind === 'JsonKeyedItem' && pointerOverlap(a.declaration.pointer, b.declaration.collectionPointer))
            conflicts.push({ kind: 'jsonPointerOverlap', owners: [a.owner, b.owner], summary: 'JSON value and collection authority overlap' })
          else if (a.declaration.kind === 'JsonKeyedItem' && b.declaration.kind === 'JsonValue' && pointerOverlap(a.declaration.collectionPointer, b.declaration.pointer))
            conflicts.push({ kind: 'jsonPointerOverlap', owners: [a.owner, b.owner], summary: 'JSON collection and value authority overlap' })
        }
      }
    }
    const operations: Array<ApplyOperation> = []; let outputs: Array<PlannedOutput> = []; const files = new Map<string, FileState>()
    for (const item of owned) {
      if (isTree(item.declaration)) {
        if (item.declaration.kind === 'ManagedTree') {
          const sourcePath = yield* resolveWithin(item.integration.artifactRoot, item.declaration.sourceRoot, 'planning')
          yield* assertNoSymlinkSegments(item.integration.artifactRoot, sourcePath, 'planning')
          const desired = yield* scanTree(sourcePath, 'planning', { allowHardLinks: true })
          if (desired.rootKind !== 'directory')
            return yield* Effect.fail(preludeError('planning', `ManagedTree ${item.declaration.id} sourceRoot must be a complete directory`, sourcePath))
          const current = yield* scanTree(item.targetPath, 'planning')
          const changed = desired.digest !== current.digest
          outputs.push({ owner: item.owner, declaration: item.declaration, resolvedPath: item.resolvedPath, status: changed ? 'change' : 'converged', currentHash: current.digest, desiredHash: desired.digest, evidence: [changed ? 'managed tree differs' : 'managed tree converged'] })
          operations.push({ kind: 'tree', outputKind: 'ManagedTree', owner: item.owner, sourcePath, targetPath: item.targetPath, desiredHash: desired.digest, changed } satisfies TreeOperation)
        }
        else {
          const archive = yield* loadPinnedReferenceTreeArchive(item.integration.artifactRoot, item.declaration)
          const current = yield* scanTree(item.targetPath, 'planning', { allowSafeSymlinks: true })
          const changed = archive.treeDigest !== current.digest
          outputs.push({ owner: item.owner, declaration: item.declaration, resolvedPath: item.resolvedPath, status: changed ? 'change' : 'converged', currentHash: current.digest, desiredHash: archive.treeDigest, evidence: [`${changed ? 'reference drift' : 'pinned reference converged'}; ${item.declaration.provenance.sourceUrl}@${item.declaration.provenance.revision}`] })
          operations.push({ kind: 'tree', outputKind: 'PinnedReferenceTree', owner: item.owner, archive, targetPath: item.targetPath, desiredHash: archive.treeDigest, changed } satisfies TreeOperation)
        }
      }
      else {
        let state = files.get(item.targetPath); if (state === undefined) { const source = (yield* readOptionalText(item.targetPath, 'planning')) ?? (item.declaration.kind === 'ManagedBlock' ? '' : '{}\n'); state = { source, desired: source, owners: [] }; files.set(item.targetPath, state) }
        try { state.desired = item.declaration.kind === 'ManagedBlock' ? applyBlock(state.desired, item.declaration) : applyJsonOutput(state.desired, item.declaration, item.resolvedPath) }
        catch (error) { conflicts.push({ kind: 'invalidCurrentState', owners: [item.owner], summary: errorMessage(error) }) }
        state.owners.push(item.owner); outputs.push({ owner: item.owner, declaration: item.declaration, resolvedPath: item.resolvedPath, status: state.source === state.desired ? 'converged' : 'change', currentHash: sha256(state.source), desiredHash: sha256(state.desired), evidence: [state.source === state.desired ? 'bounded output converged' : 'bounded output differs'] })
      }
    }
    for (const [targetPath, state] of [...files].sort(([a], [b]) => compareText(a, b))) operations.push({ kind: 'file', owners: state.owners.sort(compareOwner), targetPath, desiredContent: state.desired, changed: state.source !== state.desired } satisfies FileOperation)
    outputs = outputs.map((output) => { const ownedOutput = owned.find(item => ownerKey(item.owner) === ownerKey(output.owner)); const file = ownedOutput === undefined || isTree(ownedOutput.declaration) ? undefined : files.get(ownedOutput.targetPath); return file === undefined ? output : { ...output, status: file.source === file.desired ? 'converged' : 'change', desiredHash: sha256(file.desired) } })
    const ownedRequirements = loaded.flatMap(integration => integration.plan.requirements.map(declaration => ({ declaration, owner: { integrationId: integration.config.id, declarationId: declaration.id } })))
    for (let i = 0; i < ownedRequirements.length; i++) {
      for (let j = i + 1; j < ownedRequirements.length; j++) {
        const left = ownedRequirements[i]!; const right = ownedRequirements[j]!; if (left.declaration.packageRoot === right.declaration.packageRoot && left.declaration.packageName === right.declaration.packageName && (left.declaration.section !== right.declaration.section || !semver.intersects(left.declaration.range, right.declaration.range)))
          conflicts.push({ kind: 'packageRequirement', owners: [left.owner, right.owner].sort(compareOwner), summary: 'Package Requirements for one importer are incompatible' })
      }
    }
    const requirements = (yield* Effect.forEach(ownedRequirements, item => requirementResult(controlRoot, item.owner, item.declaration), { concurrency: 1 })).sort((a, b) => compareOwner(a.owner, b.owner)); const issues: Array<OwnedIssue> = loaded.flatMap(integration => integration.plan.issues.map(declaration => ({ owner: { integrationId: integration.config.id, declarationId: declaration.id }, declaration }))).sort((a, b) => compareOwner(a.owner, b.owner)); const checks: Array<OwnedCheck> = loaded.flatMap(integration => integration.plan.checks.map(declaration => ({ owner: { integrationId: integration.config.id, declarationId: declaration.id }, declaration }))).sort((a, b) => compareOwner(a.owner, b.owner))
    conflicts.sort((a, b) => compareText(`${a.kind}:${a.owners.map(ownerKey).join()}`, `${b.kind}:${b.owners.map(ownerKey).join()}`)); const blocked = conflicts.length > 0 || issues.length > 0 || requirements.some(requirement => !requirement.selectionSatisfied); const converged = !blocked && outputs.every(output => output.status === 'converged') && requirements.every(requirement => requirement.satisfied)
    const base = { schemaVersion: PLAN_SCHEMA_VERSION, executionHashVersion: EXECUTION_HASH_VERSION, controlRoot: '.', integrations, outputs, requirements, issues, checks, conflicts, blocked, converged } as const
    return { controlRoot, document: { ...base, executionHash: executionHash(base) }, operations: operations.sort((a, b) => compareText(a.targetPath, b.targetPath)), installRequired: !blocked && requirements.some(requirement => requirement.selectionSatisfied && !requirement.installationSatisfied) }
  })
}

export function resolveCheckRoot(controlRoot: string, check: Check): Effect.Effect<string, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const root = yield* resolveWithin(controlRoot, check.packageRoot, 'check')
    yield* assertNoSymlinkSegments(controlRoot, root, 'check')
    return root
  })
}
