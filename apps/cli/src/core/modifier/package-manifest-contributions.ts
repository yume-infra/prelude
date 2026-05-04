import type { ContributionTrace } from '@/core/ownership/model'
import type { GenerationTargetScope } from '@/schema/target-scope'
import { finalizePackageJsonOrder } from '@/core/modifier/package-json-order'
import { matchesGenerationTargetScope } from '@/schema/target-scope'

export const packageManifestSections = [
  'scripts',
  'peerDependencies',
  'peerDependenciesMeta',
  'dependencies',
  'optionalDependencies',
  'devDependencies',
  'engines',
  'pnpm',
  'overrides',
  'resolutions',
  'husky',
  'simple-git-hooks',
  'lint-staged',
] as const

export type PackageManifestSection = typeof packageManifestSections[number]
export type PackageManifestLocation = '<root>' | PackageManifestSection
export type PackageManifestEntries = Record<string, unknown>
export type PackageManifestTargetPath = 'package.json' | `${string}/package.json`

export const rootPackageManifestTargetPath = 'package.json' satisfies PackageManifestTargetPath

export interface PackageManifestContribution {
  readonly ownership: ContributionTrace
  readonly targetPath?: PackageManifestTargetPath
  readonly targetScope?: GenerationTargetScope
  readonly fields?: PackageManifestEntries
  readonly sections?: Partial<Record<PackageManifestSection, PackageManifestEntries>>
}

export interface PackageManifestProvenanceEntry {
  readonly targetPath: PackageManifestTargetPath
  readonly section: PackageManifestLocation
  readonly key: string
  readonly owners: readonly string[]
  readonly value: unknown
}

export interface PackageManifestCollection {
  readonly targetPath: PackageManifestTargetPath
  readonly manifest: Record<string, unknown>
  readonly provenance: readonly PackageManifestProvenanceEntry[]
}

export class PackageManifestContributionConflictError extends Error {
  readonly targetPath: PackageManifestTargetPath
  readonly section: PackageManifestLocation
  readonly key: string
  readonly existingOwners: readonly string[]
  readonly incomingOwner: string
  readonly existingValue: unknown
  readonly incomingValue: unknown

  constructor(options: {
    readonly targetPath: PackageManifestTargetPath
    readonly section: PackageManifestLocation
    readonly key: string
    readonly existingOwners: readonly string[]
    readonly incomingOwner: string
    readonly existingValue: unknown
    readonly incomingValue: unknown
  }) {
    const location = options.section === '<root>' ? options.key : `${options.section}.${options.key}`
    super([
      `Package manifest contribution conflict at ${options.targetPath} ${location}.`,
      `Existing owner(s): ${options.existingOwners.join(', ')} with value ${formatDiagnosticValue(options.existingValue)}.`,
      `Incoming owner: ${options.incomingOwner} with value ${formatDiagnosticValue(options.incomingValue)}.`,
    ].join(' '))
    this.name = 'PackageManifestContributionConflictError'
    this.targetPath = options.targetPath
    this.section = options.section
    this.key = options.key
    this.existingOwners = options.existingOwners
    this.incomingOwner = options.incomingOwner
    this.existingValue = options.existingValue
    this.incomingValue = options.incomingValue
  }
}

interface MutableProvenanceEntry {
  readonly targetPath: PackageManifestTargetPath
  readonly section: PackageManifestLocation
  readonly key: string
  readonly owners: string[]
  readonly value: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneValue)
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneValue(nestedValue)]),
    )
  }

  return value
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return cloneValue(value) as Record<string, unknown>
}

function formatDiagnosticValue(value: unknown): string {
  const formatted = JSON.stringify(value)
  return formatted ?? String(value)
}

function valuesMatch(left: unknown, right: unknown): boolean {
  return formatDiagnosticValue(left) === formatDiagnosticValue(right)
}

function slotId(section: PackageManifestLocation, key: string): string {
  return `${section}\u0000${key}`
}

export function packageManifestTargetPath(targetDirectory: string | undefined): PackageManifestTargetPath {
  const normalizedDirectory = targetDirectory?.replace(/^\/+|\/+$/g, '') ?? ''
  return normalizedDirectory
    ? `${normalizedDirectory}/package.json` as PackageManifestTargetPath
    : rootPackageManifestTargetPath
}

export function comparePackageManifestTargetPaths(
  left: PackageManifestTargetPath,
  right: PackageManifestTargetPath,
): number {
  if (left === right) {
    return 0
  }

  if (left === rootPackageManifestTargetPath) {
    return -1
  }

  if (right === rootPackageManifestTargetPath) {
    return 1
  }

  return left.localeCompare(right)
}

export function shouldApplyPackageManifestContribution(
  contribution: PackageManifestContribution,
  options: {
    readonly targetPath: PackageManifestTargetPath
    readonly targetScope: GenerationTargetScope
  },
): boolean {
  return matchesGenerationTargetScope(contribution.targetScope, options.targetScope)
    && (!contribution.targetPath || contribution.targetPath === options.targetPath)
}

function mutableRecordAtSection(
  draft: Record<string, unknown>,
  section: PackageManifestSection,
): Record<string, unknown> {
  const current = draft[section]

  if (isPlainObject(current)) {
    return current
  }

  const next: Record<string, unknown> = {}
  draft[section] = next
  return next
}

function applyEntry(options: {
  readonly target: Record<string, unknown>
  readonly targetPath: PackageManifestTargetPath
  readonly provenance: Map<string, MutableProvenanceEntry>
  readonly section: PackageManifestLocation
  readonly key: string
  readonly value: unknown
  readonly owner: string
}) {
  const existingValue = options.target[options.key]
  const hasExistingValue = Object.hasOwn(options.target, options.key)
  const id = slotId(options.section, options.key)
  const existingProvenance = options.provenance.get(id)
  const existingOwners = existingProvenance?.owners ?? ['<base>']

  if (hasExistingValue && !valuesMatch(existingValue, options.value)) {
    throw new PackageManifestContributionConflictError({
      targetPath: options.targetPath,
      section: options.section,
      key: options.key,
      existingOwners,
      incomingOwner: options.owner,
      existingValue,
      incomingValue: options.value,
    })
  }

  if (!hasExistingValue) {
    options.target[options.key] = cloneValue(options.value)
  }

  if (existingProvenance) {
    if (!existingProvenance.owners.includes(options.owner)) {
      existingProvenance.owners.push(options.owner)
    }
    return
  }

  options.provenance.set(id, {
    targetPath: options.targetPath,
    section: options.section,
    key: options.key,
    owners: [options.owner],
    value: cloneValue(options.value),
  })
}

export function collectPackageManifestContributions(options: {
  readonly targetPath?: PackageManifestTargetPath
  readonly targetScope?: GenerationTargetScope
  readonly base?: Record<string, unknown>
  readonly contributions: readonly PackageManifestContribution[]
}): PackageManifestCollection {
  const targetPath = options.targetPath ?? rootPackageManifestTargetPath
  const targetScope = options.targetScope ?? 'both'
  const draft = options.base ? cloneRecord(options.base) : {}
  const provenance = new Map<string, MutableProvenanceEntry>()

  for (const contribution of options.contributions) {
    if (!shouldApplyPackageManifestContribution(contribution, { targetPath, targetScope })) {
      continue
    }

    const owner = contribution.ownership.owner

    for (const [key, value] of Object.entries(contribution.fields ?? {})) {
      applyEntry({
        target: draft,
        targetPath,
        provenance,
        section: '<root>',
        key,
        value,
        owner,
      })
    }

    for (const section of packageManifestSections) {
      const entries = contribution.sections?.[section]
      if (!entries) {
        continue
      }

      const target = mutableRecordAtSection(draft, section)
      for (const [key, value] of Object.entries(entries)) {
        applyEntry({
          target,
          targetPath,
          provenance,
          section,
          key,
          value,
          owner,
        })
      }
    }
  }

  finalizePackageJsonOrder(draft)

  return {
    targetPath,
    manifest: draft,
    provenance: [...provenance.values()].map(entry => ({
      targetPath: entry.targetPath,
      section: entry.section,
      key: entry.key,
      owners: [...entry.owners],
      value: cloneValue(entry.value),
    })),
  }
}

export function collectPackageManifestContributionsByTarget(options: {
  readonly targetScope?: GenerationTargetScope
  readonly bases?: Partial<Record<PackageManifestTargetPath, Record<string, unknown>>>
  readonly contributions: readonly PackageManifestContribution[]
}): readonly PackageManifestCollection[] {
  const targetScope = options.targetScope ?? 'both'
  const targetPaths = new Set<PackageManifestTargetPath>(
    Object.keys(options.bases ?? {}) as PackageManifestTargetPath[],
  )

  for (const contribution of options.contributions) {
    if (!matchesGenerationTargetScope(contribution.targetScope, targetScope)) {
      continue
    }

    targetPaths.add(contribution.targetPath ?? rootPackageManifestTargetPath)
  }

  return [...targetPaths]
    .sort(comparePackageManifestTargetPaths)
    .map((targetPath) => {
      const targetContributions = options.contributions.filter(contribution =>
        contribution.targetPath
          ? contribution.targetPath === targetPath
          : targetPath === rootPackageManifestTargetPath,
      )

      const base = options.bases?.[targetPath]

      return collectPackageManifestContributions({
        targetPath,
        targetScope,
        ...(base ? { base } : {}),
        contributions: targetContributions,
      })
    })
}
