import semver from 'semver'
import { parse as parseYaml } from 'yaml'

import { sha256, stableJson } from './model.js'

interface SelectionInput {
  readonly manifestSource: string
  readonly lockSource: string
  readonly packageName: string
  readonly installedManifestSource: string
  readonly installedLockSource: string
}

interface LockDependency {
  readonly specifier?: unknown
  readonly version?: unknown
}

interface PnpmLock {
  readonly lockfileVersion?: unknown
  readonly importers?: Record<string, { readonly dependencies?: Record<string, LockDependency | string>, readonly devDependencies?: Record<string, LockDependency | string> }>
  readonly packages?: Record<string, unknown>
  readonly snapshots?: Record<string, unknown>
  readonly patchedDependencies?: Record<string, unknown>
}

export function linkedSelectionPath(lockVersion: string): string | undefined {
  return lockVersion.startsWith('link:') ? lockVersion.slice('link:'.length) : undefined
}

function parseObject(source: string, label: string): Record<string, unknown> {
  const value: unknown = JSON.parse(source)
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`${label} must be an object`)
  return value as Record<string, unknown>
}

function selectedVersion(lockVersion: string): string | undefined {
  if (/^(?:file|link|workspace):/.test(lockVersion))
    return undefined
  const selected = /^(\d+\.\d+\.\d+(?:-[0-9A-Z-]+(?:\.[0-9A-Z-]+)*)?(?:\+[0-9A-Z-]+(?:\.[0-9A-Z-]+)*)?)(?=[(#_]|$)/i.exec(lockVersion)?.[1]
  return selected !== undefined && semver.valid(selected) !== null ? selected : undefined
}

export function inspectLockSelection(input: {
  readonly lockSource: string
  readonly importer: string
  readonly section: 'dependencies' | 'devDependencies'
  readonly packageName: string
}): { readonly specifier?: string, readonly version?: string, readonly selectedVersion?: string } {
  const lock = parseLock(input.lockSource, 'pnpm-lock.yaml lockfile')
  const raw = lock.importers?.[input.importer]?.[input.section]?.[input.packageName]
  const specifier = typeof raw === 'string' ? undefined : raw?.specifier
  const version = typeof raw === 'string' ? raw : raw?.version
  const registryVersion = typeof version === 'string' ? selectedVersion(version) : undefined
  return {
    ...(typeof specifier === 'string' ? { specifier } : {}),
    ...(typeof version === 'string' ? { version } : {}),
    ...(registryVersion === undefined ? {} : { selectedVersion: registryVersion }),
  }
}

export function evaluateRequirementSelection(input: { readonly range: string, readonly packageName?: string | undefined, readonly installedName?: string | undefined, readonly directSpecifier?: string | undefined, readonly lockSpecifier?: string | undefined, readonly lockVersion?: string | undefined, readonly installedLockVersion?: string | undefined, readonly installedVersion?: string | undefined, readonly lockIdentityMatches?: boolean | undefined }): { readonly satisfied: boolean } {
  if (input.directSpecifier === undefined || input.lockVersion === undefined || input.installedVersion === undefined)
    return { satisfied: false }
  const aliasSpecifier = input.directSpecifier.startsWith('npm:') ? input.directSpecifier.slice('npm:'.length) : undefined
  const aliasTarget = aliasSpecifier?.replace(/@[^@]+$/, '')
  const effectiveRange = aliasSpecifier === undefined ? input.range : aliasSpecifier.slice(aliasTarget!.length + 1)
  if (semver.valid(input.installedVersion) === null || !semver.satisfies(input.installedVersion, effectiveRange))
    return { satisfied: false }
  if (input.packageName !== undefined && input.installedName !== (aliasTarget ?? input.packageName))
    return { satisfied: false }
  if (input.lockSpecifier !== undefined && input.lockSpecifier !== input.directSpecifier)
    return { satisfied: false }
  const registryVersion = selectedVersion(input.lockVersion)
  return { satisfied: (registryVersion === undefined || registryVersion === input.installedVersion) && (input.installedLockVersion === undefined || input.installedLockVersion === input.lockVersion) && input.lockIdentityMatches !== false }
}

function lockSelectionIdentity(lock: PnpmLock, packageName: string, lockVersion: string, packageVersion: string) {
  const related = (entries: Record<string, unknown> | undefined) => Object.fromEntries(Object.entries(entries ?? {}).filter(([key]) => key.includes(packageName) && (key.includes(lockVersion) || key.includes(packageVersion))))
  return {
    lockfileVersion: lock.lockfileVersion,
    lockVersion,
    packages: related(lock.packages),
    snapshots: related(lock.snapshots),
    patches: related(lock.patchedDependencies),
  }
}

function parseLock(source: string, label: string): PnpmLock {
  const lock = parseYaml(source) as PnpmLock
  if (lock === null || typeof lock !== 'object' || lock.lockfileVersion === undefined)
    throw new Error(`${label} is malformed`)
  return lock
}

export function compareLockSelection(input: { readonly lockSource: string, readonly installedLockSource: string, readonly importer: string, readonly section: 'dependencies' | 'devDependencies', readonly packageName: string, readonly packageVersion: string }): { readonly lockSpecifier?: string, readonly lockVersion?: string, readonly installedLockVersion?: string, readonly matches: boolean } {
  const root = parseLock(input.lockSource, 'pnpm-lock.yaml lockfile')
  const installed = parseLock(input.installedLockSource, 'installed lockfile')
  const select = (lock: PnpmLock) => lock.importers?.[input.importer]?.[input.section]?.[input.packageName]
  const rootRaw = select(root)
  const installedRaw = select(installed)
  const lockSpecifier = typeof rootRaw === 'string' ? undefined : rootRaw?.specifier
  const lockVersion = typeof rootRaw === 'string' ? rootRaw : rootRaw?.version
  const installedLockVersion = typeof installedRaw === 'string' ? installedRaw : installedRaw?.version
  if (typeof lockVersion !== 'string' || typeof installedLockVersion !== 'string')
    return { matches: false, ...(typeof lockSpecifier === 'string' ? { lockSpecifier } : {}), ...(typeof lockVersion === 'string' ? { lockVersion } : {}), ...(typeof installedLockVersion === 'string' ? { installedLockVersion } : {}) }
  const matches = stableJson(lockSelectionIdentity(root, input.packageName, lockVersion, input.packageVersion)) === stableJson(lockSelectionIdentity(installed, input.packageName, installedLockVersion, input.packageVersion))
  return { matches, ...(typeof lockSpecifier === 'string' ? { lockSpecifier } : {}), lockVersion, installedLockVersion }
}

export function selectRootArtifact(input: SelectionInput): { readonly packageVersion: string, readonly resolutionId: string, readonly lockVersion: string } {
  if (input.lockSource.trim() === '')
    throw new Error('pnpm-lock.yaml lockfile is required')
  const manifest = parseObject(input.manifestSource, 'Control Root package.json')
  const devDependencies = manifest.devDependencies
  if (devDependencies === null || typeof devDependencies !== 'object' || Array.isArray(devDependencies) || typeof (devDependencies as Record<string, unknown>)[input.packageName] !== 'string')
    throw new Error(`${input.packageName} must be a root devDependencies entry`)
  const directSpecifier = (devDependencies as Record<string, string>)[input.packageName]!
  const lock = parseLock(input.lockSource, 'pnpm-lock.yaml lockfile')
  const rawSelection = lock.importers?.['.']?.devDependencies?.[input.packageName]
  const lockSpecifier = typeof rawSelection === 'string' ? directSpecifier : rawSelection?.specifier
  const lockVersion = typeof rawSelection === 'string' ? rawSelection : rawSelection?.version
  if (typeof lockVersion !== 'string' || typeof lockSpecifier !== 'string' || lockSpecifier !== directSpecifier)
    throw new Error(`${input.packageName} root lock entry does not match package.json`)
  const installed = parseObject(input.installedManifestSource, 'installed package.json')
  if (installed.name !== input.packageName || typeof installed.version !== 'string')
    throw new Error(`${input.packageName} installed package identity is invalid`)
  const registryVersion = selectedVersion(lockVersion)
  if (registryVersion !== undefined && registryVersion !== installed.version)
    throw new Error(`${input.packageName} installed version does not match selected lock resolution`)

  const installedLock = parseLock(input.installedLockSource, 'installed lockfile')
  const installedRaw = installedLock.importers?.['.']?.devDependencies?.[input.packageName]
  const installedLockVersion = typeof installedRaw === 'string' ? installedRaw : installedRaw?.version
  if (typeof installedLockVersion !== 'string')
    throw new Error(`${input.packageName} is missing from installed lockfile`)
  const rootIdentity = lockSelectionIdentity(lock, input.packageName, lockVersion, installed.version)
  const installedIdentity = lockSelectionIdentity(installedLock, input.packageName, installedLockVersion, installed.version)
  if (stableJson(rootIdentity) !== stableJson(installedIdentity))
    throw new Error(`${input.packageName} installed lock selection does not match root lockfile`)

  const canonicalIdentity = {
    packageName: input.packageName,
    directSpecifier,
    packageVersion: installed.version,
    ...rootIdentity,
  }
  return { packageVersion: installed.version, lockVersion, resolutionId: sha256(stableJson(canonicalIdentity)) }
}
