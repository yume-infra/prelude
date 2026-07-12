/* eslint-disable style/max-statements-per-line */
import type { Check, JsonKeyedItem, JsonValue, ManagedBlock, Output, PackageRequirement } from '@sayoriqwq/prelude-contract'
import type { PreludeError } from './errors.js'
import type { ApplyOperation, Conflict, FileOperation, IntegrationPlan, OwnedCheck, OwnedIssue, Owner, PlannedConvergence, PlannedOutput, RequirementResult, TreeOperation } from './model.js'
import type { LoadedIntegration } from './module-loader.js'
import { Effect, FileSystem, Path } from 'effect'

import { applyEdits, findNodeAtLocation, getNodePath, modify, parse, parseTree, visit } from 'jsonc-parser'
import semver from 'semver'
import { compareLockSelection, evaluateRequirementSelection, linkedSelectionPath } from './artifact-selection.js'
import { loadPreludeConfig } from './config.js'
import { errorMessage, preludeError } from './errors.js'
import { assertTargetWritePath, readOptionalText, resolveWithin, scanTree } from './filesystem.js'
import {
  executionHash,

  ownerKey,
  sha256,
  stableJson,

} from './model.js'
import { loadIntegration } from './module-loader.js'

interface OwnedOutput { readonly owner: Owner, readonly declaration: Output, readonly integration: LoadedIntegration, readonly targetPath: string }
interface FileState { source: string, desired: string, owners: Array<Owner>, kinds: Set<string> }

const compareOwner = (a: Owner, b: Owner) => ownerKey(a).localeCompare(ownerKey(b))
const pointerParts = (pointer: string) => pointer === '' ? [] : pointer.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))
const pathOverlap = (left: string, right: string) => left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)
function pointerOverlap(left: string, right: string) {
  const a = pointerParts(left); const b = pointerParts(right); const n = Math.min(a.length, b.length)
  return a.slice(0, n).every((part, index) => part === b[index])
}

function blockMarkers(blockId: string) {
  return { start: `<!-- prelude:${blockId}:start -->`, end: `<!-- prelude:${blockId}:end -->` }
}

function applyBlock(source: string, block: ManagedBlock): string {
  const { start, end } = blockMarkers(block.blockId)
  const startAt = source.indexOf(start); const endAt = source.indexOf(end)
  if ((startAt < 0) !== (endAt < 0) || source.includes(start, startAt + 1) || source.includes(end, endAt + 1) || (startAt >= 0 && endAt < startAt))
    throw new Error(`invalid or duplicate markers for ${block.blockId}`)
  const body = `${start}\n${block.content.replace(/\n+$/, '')}\n${end}`
  if (startAt < 0)
    return `${source.replace(/\s*$/, '')}${source.trim() === '' ? '' : '\n\n'}${body}\n`
  return `${source.slice(0, startAt)}${body}${source.slice(endAt + end.length)}`
}

function assertJson(source: string, path: string): unknown {
  const errors: Array<{ error: number, offset: number, length: number }> = []
  const value = parse(source, errors, { allowTrailingComma: true, disallowComments: false })
  if (errors.length > 0)
    throw new Error(`${path} contains invalid JSONC`)
  const seen = new Set<string>(); let duplicate: string | undefined
  visit(source, { onObjectProperty: (_property, offset) => {
    const tree = parseTree(source, [], { allowTrailingComma: true, disallowComments: false })
    const node = tree === undefined ? undefined : findNodeAtLocation(tree, getNodePath({ type: 'property', offset, length: 0, parent: undefined, children: undefined } as never))
    void node
  } }, { allowTrailingComma: true, disallowComments: false })
  const detect = (node: ReturnType<typeof parseTree>, prefix = ''): void => {
    if (node?.type === 'object') {
      const local = new Set<string>()
      for (const property of node.children ?? []) {
        const key = String(property.children?.[0]?.value)
        if (local.has(key))
          duplicate = `${prefix}/${key}`
        local.add(key); detect(property.children?.[1], `${prefix}/${key}`)
      }
    }
    else {
      for (const child of node?.children ?? []) detect(child, prefix)
    }
  }
  detect(parseTree(source, [], { allowTrailingComma: true, disallowComments: false }))
  if (duplicate !== undefined)
    throw new Error(`${path} contains duplicate key ${duplicate}`)
  void seen
  return value
}

export function applyJsonOutput(source: string, output: JsonValue | JsonKeyedItem, path: string): string {
  const root = assertJson(source, path)
  const formattingOptions = { insertSpaces: true, tabSize: 2, eol: source.includes('\r\n') ? '\r\n' : '\n' }
  if (output.kind === 'JsonValue')
    return applyEdits(source, modify(source, pointerParts(output.pointer), output.value, { formattingOptions }))
  const collectionPath = pointerParts(output.collectionPointer)
  const current = collectionPath.reduce<unknown>((value, key) => value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, root)
  if (current !== undefined && !Array.isArray(current))
    throw new Error(`${path}${output.collectionPointer} is not an array`)
  const items = (current ?? []) as Array<unknown>
  const matches = items.flatMap((item, index) => item !== null && typeof item === 'object' && (item as Record<string, unknown>)[output.keyField] === output.keyValue ? [index] : [])
  if (matches.length > 1)
    throw new Error(`${path}${output.collectionPointer} contains duplicate keyed items`)
  if (matches[0] !== undefined) {
    const itemPath = [...collectionPath, matches[0]]
    const updateObject = (text: string, location: Array<string | number>, before: unknown, desired: unknown): string => {
      if (before === null || desired === null || typeof before !== 'object' || typeof desired !== 'object' || Array.isArray(before) || Array.isArray(desired))
        return Object.is(before, desired) ? text : applyEdits(text, modify(text, location, desired, { formattingOptions }))
      const previous = before as Record<string, unknown>; const next = desired as Record<string, unknown>
      for (const key of Object.keys(previous).filter(key => !(key in next)))
        text = applyEdits(text, modify(text, [...location, key], undefined, { formattingOptions }))
      for (const [key, value] of Object.entries(next))
        text = key in previous ? updateObject(text, [...location, key], previous[key], value) : applyEdits(text, modify(text, [...location, key], value, { formattingOptions }))
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
      const left = declarations[index]!
      const right = declarations[otherIndex]!
      if (left.kind === 'ManagedTree' || right.kind === 'ManagedTree')
        continue
      if (left.path !== right.path)
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

function requirementResult(controlRoot: string, owner: Owner, requirement: PackageRequirement): Effect.Effect<RequirementResult, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem; const path = yield* Path.Path
    const importer = requirement.packageRoot === '.' ? controlRoot : path.join(controlRoot, requirement.packageRoot)
    const manifest = JSON.parse(yield* fs.readFileString(path.join(importer, 'package.json'))) as Record<string, Record<string, string> | undefined>
    const directDeclaration = manifest[requirement.section]?.[requirement.packageName]
    const lockSource = yield* readOptionalText(path.join(controlRoot, 'pnpm-lock.yaml'), 'planning')
    const installedLockSource = yield* readOptionalText(path.join(controlRoot, 'node_modules/.pnpm/lock.yaml'), 'planning')
    let installedVersion: string | undefined
    let installedName: string | undefined
    try {
      const installed = JSON.parse(yield* fs.readFileString(path.join(importer, 'node_modules', requirement.packageName, 'package.json'))) as { name?: string, version?: string }
      installedVersion = installed.version; installedName = installed.name
    }
    catch { /* represented as unsatisfied */ }
    const evidence = lockSource === undefined || installedLockSource === undefined || installedVersion === undefined ? { matches: false as const } : compareLockSelection({ lockSource, installedLockSource, importer: requirement.packageRoot, section: requirement.section, packageName: requirement.packageName, packageVersion: installedVersion })
    let linkedPathMatches = true
    const linkedPath = evidence.lockVersion === undefined ? undefined : linkedSelectionPath(evidence.lockVersion)
    if (linkedPath !== undefined) {
      try {
        const selectedRealPath = yield* fs.realPath(path.resolve(importer, linkedPath))
        const installedRealPath = yield* fs.realPath(path.join(importer, 'node_modules', requirement.packageName))
        linkedPathMatches = selectedRealPath === installedRealPath
      }
      catch { linkedPathMatches = false }
    }
    const lockResolution = evidence.lockVersion
    const satisfied = evaluateRequirementSelection({ range: requirement.range, packageName: requirement.packageName, installedName, directSpecifier: directDeclaration, lockSpecifier: evidence.lockSpecifier ?? directDeclaration, lockVersion: lockResolution, installedLockVersion: evidence.installedLockVersion, installedVersion, lockIdentityMatches: evidence.matches && linkedPathMatches }).satisfied
    return { owner, declaration: requirement, satisfied, ...(directDeclaration === undefined ? {} : { directDeclaration }), ...(lockResolution === undefined ? {} : { lockResolution }), ...(installedVersion === undefined ? {} : { installedVersion }), evidence: [satisfied ? 'direct declaration, lockfile, and installation satisfy range' : 'package prerequisite is not fully satisfied'] }
  }).pipe(Effect.mapError(error => preludeError('planning', `Cannot inspect package requirement ${requirement.packageName}`, errorMessage(error))))
}

export function planConvergence(controlRoot: string): Effect.Effect<PlannedConvergence, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const config = yield* loadPreludeConfig(controlRoot)
    const loaded = yield* Effect.forEach(config.integrations, integration => loadIntegration(controlRoot, integration), { concurrency: 1 })
    loaded.sort((a, b) => a.config.id.localeCompare(b.config.id))
    for (const integration of loaded) {
      for (const requirement of integration.plan.requirements) {
        if (requirement.packageRoot !== integration.config.packageRoot)
          return yield* Effect.fail(preludeError('planning', `Requirement ${requirement.id} must use its Integration packageRoot`, `${requirement.packageRoot} != ${integration.config.packageRoot}`))
        yield* resolveWithin(controlRoot, requirement.packageRoot, 'planning')
      }
      for (const check of integration.plan.checks) {
        if (check.packageRoot !== integration.config.packageRoot)
          return yield* Effect.fail(preludeError('planning', `Check ${check.id} must use its Integration packageRoot`, `${check.packageRoot} != ${integration.config.packageRoot}`))
        yield* resolveWithin(controlRoot, check.packageRoot, 'planning')
      }
    }
    const integrations: Array<IntegrationPlan> = loaded.map(item => ({ integrationId: item.config.id, packageRoot: item.config.packageRoot, module: item.config.module, descriptor: item.descriptor, artifact: item.artifact, plan: item.plan }))
    const owned: Array<OwnedOutput> = []
    for (const integration of loaded) {
      for (const declaration of integration.plan.outputs) {
        const owner = { integrationId: integration.config.id, declarationId: declaration.id }
        const relative = integration.config.packageRoot === '.' ? declaration.kind === 'ManagedTree' ? declaration.targetRoot : declaration.path : `${integration.config.packageRoot}/${declaration.kind === 'ManagedTree' ? declaration.targetRoot : declaration.path}`
        owned.push({ owner, declaration, integration, targetPath: relative })
      }
    }
    owned.sort((a, b) => compareOwner(a.owner, b.owner))
    const conflicts: Array<Conflict> = []
    for (let i = 0; i < owned.length; i++) {
      for (let j = i + 1; j < owned.length; j++) {
        const a = owned[i]!; const b = owned[j]!
        if (a.declaration.kind === 'ManagedTree' || b.declaration.kind === 'ManagedTree') {
          if (pathOverlap(a.targetPath, b.targetPath))
            conflicts.push({ kind: a.declaration.kind === 'ManagedTree' && b.declaration.kind === 'ManagedTree' ? 'treeOverlap' : 'treeBoundedOverlap', owners: [a.owner, b.owner], summary: 'Managed tree authority overlaps another Output' })
        }
        else if (a.targetPath === b.targetPath) {
          if (a.declaration.kind === 'ManagedBlock' && b.declaration.kind === 'ManagedBlock' && a.declaration.blockId === b.declaration.blockId)
            conflicts.push({ kind: 'blockIdentity', owners: [a.owner, b.owner], summary: 'Managed block identity is duplicated' })
          else if ((a.declaration.kind === 'ManagedBlock') !== (b.declaration.kind === 'ManagedBlock'))
            conflicts.push({ kind: 'boundedFileKind', owners: [a.owner, b.owner], summary: 'Text block and JSON authority share one file' })
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

    const operations: Array<ApplyOperation> = []; const outputs: Array<PlannedOutput> = []; const files = new Map<string, FileState>()
    for (const item of owned) {
      if (item.declaration.kind === 'ManagedTree') {
        const sourcePath = yield* resolveWithin(item.integration.artifactRoot, item.declaration.sourceRoot, 'planning'); const targetPath = yield* resolveWithin(controlRoot, item.targetPath, 'planning')
        yield* assertTargetWritePath(controlRoot, targetPath)
        const desired = yield* scanTree(sourcePath, 'planning', { allowHardLinks: true }); const current = yield* scanTree(targetPath, 'planning'); const changed = desired.digest !== current.digest
        outputs.push({ owner: item.owner, declaration: item.declaration, status: changed ? 'change' : 'converged', currentHash: current.digest, desiredHash: desired.digest, evidence: [changed ? 'managed tree differs' : 'managed tree converged'] })
        operations.push({ kind: 'tree', owner: item.owner, sourcePath, targetPath, desiredHash: desired.digest, changed } satisfies TreeOperation)
      }
      else {
        const targetPath = yield* resolveWithin(controlRoot, item.targetPath, 'planning')
        yield* assertTargetWritePath(controlRoot, targetPath)
        let state = files.get(targetPath)
        if (state === undefined) { const source = (yield* readOptionalText(targetPath, 'planning')) ?? (item.declaration.kind === 'ManagedBlock' ? '' : '{}\n'); state = { source, desired: source, owners: [], kinds: new Set() }; files.set(targetPath, state) }
        try { state.desired = item.declaration.kind === 'ManagedBlock' ? applyBlock(state.desired, item.declaration) : applyJsonOutput(state.desired, item.declaration, item.targetPath) }
        catch (error) { conflicts.push({ kind: 'invalidCurrentState', owners: [item.owner], summary: errorMessage(error) }) }
        state.owners.push(item.owner); state.kinds.add(item.declaration.kind)
        const desiredHash = sha256(stableJson(item.declaration)); const currentHash = sha256(state.source)
        outputs.push({ owner: item.owner, declaration: item.declaration, status: state.source === state.desired ? 'converged' : 'change', currentHash, desiredHash, evidence: [state.source === state.desired ? 'bounded output converged' : 'bounded output differs'] })
      }
    }
    for (const [targetPath, state] of [...files].sort(([a], [b]) => a.localeCompare(b))) operations.push({ kind: 'file', owners: state.owners.sort(compareOwner), targetPath, desiredContent: state.desired, changed: state.source !== state.desired } satisfies FileOperation)

    const ownedRequirements = loaded.flatMap(integration => integration.plan.requirements.map(declaration => ({ integration, declaration, owner: { integrationId: integration.config.id, declarationId: declaration.id } })))
    for (let index = 0; index < ownedRequirements.length; index++) {
      for (let otherIndex = index + 1; otherIndex < ownedRequirements.length; otherIndex++) {
        const left = ownedRequirements[index]!
        const right = ownedRequirements[otherIndex]!
        if (left.declaration.packageRoot === right.declaration.packageRoot && left.declaration.packageName === right.declaration.packageName && (left.declaration.section !== right.declaration.section || !semver.intersects(left.declaration.range, right.declaration.range)))
          conflicts.push({ kind: 'packageRequirement', owners: [left.owner, right.owner].sort(compareOwner), summary: 'Package Requirements for one importer are incompatible' })
      }
    }
    const requirements = (yield* Effect.forEach(ownedRequirements, item => requirementResult(controlRoot, item.owner, item.declaration), { concurrency: 1 })).sort((a, b) => compareOwner(a.owner, b.owner))
    const issues: Array<OwnedIssue> = loaded.flatMap(integration => integration.plan.issues.map(declaration => ({ owner: { integrationId: integration.config.id, declarationId: declaration.id }, declaration }))).sort((a, b) => compareOwner(a.owner, b.owner))
    const checks: Array<OwnedCheck> = loaded.flatMap(integration => integration.plan.checks.map(declaration => ({ owner: { integrationId: integration.config.id, declarationId: declaration.id }, declaration }))).sort((a, b) => compareOwner(a.owner, b.owner))
    conflicts.sort((a, b) => `${a.kind}:${a.owners.map(ownerKey).join()}`.localeCompare(`${b.kind}:${b.owners.map(ownerKey).join()}`))
    const base = { schemaVersion: 1 as const, executionHashVersion: 1 as const, integrations, outputs, requirements, issues, checks, conflicts, blocked: conflicts.length > 0 || issues.length > 0 || requirements.some(requirement => !requirement.satisfied) }
    return { document: { ...base, executionHash: executionHash(base) }, operations: operations.sort((a, b) => (a.kind === 'tree' ? a.targetPath : a.targetPath).localeCompare(b.kind === 'tree' ? b.targetPath : b.targetPath)) }
  })
}

export function resolveCheckRoot(controlRoot: string, check: Check): Effect.Effect<string, PreludeError, Path.Path> {
  return resolveWithin(controlRoot, check.packageRoot, 'check')
}
