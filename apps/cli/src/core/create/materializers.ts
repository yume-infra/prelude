import type {
  CapabilityContribution,
  EslintRootContribution,
  GeneratedUserFileContribution,
  JsonValue,
  KnipRootContribution,
  PackageManifestContribution,
  ProviderArtifactContribution,
  ReactAppShellContribution,
  WriteOperation,
  WritePlan,
} from './model'
import * as path from 'node:path'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'

interface StructuredSlot {
  readonly value: JsonValue
  readonly owners: readonly string[]
}

function formatJsonPointer(path: readonly string[]) {
  return `/${path.join('/')}`
}

function formatDiagnosticValue(value: JsonValue) {
  return JSON.stringify(value)
}

function isJsonRecord(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return value !== null && !Array.isArray(value) && typeof value === 'object'
}

function cloneJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue)
  }

  if (isJsonRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneJsonValue(nestedValue)]),
    )
  }

  return value
}

function jsonValuesMatch(left: JsonValue, right: JsonValue) {
  return formatDiagnosticValue(left) === formatDiagnosticValue(right)
}

function packageManifestConflict(options: {
  readonly surfaceId: string
  readonly path: readonly string[]
  readonly existing: StructuredSlot
  readonly incomingOwner: string
  readonly incomingValue: JsonValue
}) {
  return new SchemaContractError({
    schema: options.surfaceId,
    issueCount: 1,
    message: [
      `Conflicting ${options.surfaceId} contribution at ${formatJsonPointer(options.path)}.`,
      `Existing owner(s): ${options.existing.owners.join(', ')} with value ${formatDiagnosticValue(options.existing.value)}.`,
      `Incoming owner: ${options.incomingOwner} with value ${formatDiagnosticValue(options.incomingValue)}.`,
    ].join(' '),
  })
}

function recordOwner(slots: Map<string, StructuredSlot>, path: readonly string[], owner: string, value: JsonValue) {
  const key = formatJsonPointer(path)
  const existing = slots.get(key)

  if (existing) {
    if (!existing.owners.includes(owner)) {
      slots.set(key, {
        value: existing.value,
        owners: [...existing.owners, owner],
      })
    }
    return
  }

  slots.set(key, {
    value: cloneJsonValue(value),
    owners: [owner],
  })
}

function recordStructuredOwners(
  slots: Map<string, StructuredSlot>,
  path: readonly string[],
  owner: string,
  value: JsonValue,
) {
  if (isJsonRecord(value)) {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      recordStructuredOwners(slots, [...path, nestedKey], owner, nestedValue)
    }
    return
  }

  recordOwner(slots, path, owner, value)
}

function mergeStructuredValue(options: {
  readonly target: Record<string, JsonValue>
  readonly key: string
  readonly incomingValue: JsonValue
  readonly incomingOwner: string
  readonly path: readonly string[]
  readonly slots: Map<string, StructuredSlot>
  readonly surfaceId: string
}): SchemaContractError | undefined {
  const nextPath = [...options.path, options.key]
  const existingValue = options.target[options.key]

  if (existingValue === undefined && !Object.hasOwn(options.target, options.key)) {
    options.target[options.key] = cloneJsonValue(options.incomingValue)
    recordStructuredOwners(options.slots, nextPath, options.incomingOwner, options.incomingValue)
    return undefined
  }

  const currentValue = existingValue as JsonValue

  if (isJsonRecord(currentValue) && isJsonRecord(options.incomingValue)) {
    for (const [nestedKey, nestedValue] of Object.entries(options.incomingValue)) {
      const conflict = mergeStructuredValue({
        target: currentValue as Record<string, JsonValue>,
        key: nestedKey,
        incomingValue: nestedValue,
        incomingOwner: options.incomingOwner,
        path: nextPath,
        slots: options.slots,
        surfaceId: options.surfaceId,
      })

      if (conflict) {
        return conflict
      }
    }
    return undefined
  }

  if (jsonValuesMatch(currentValue, options.incomingValue)) {
    recordOwner(options.slots, nextPath, options.incomingOwner, options.incomingValue)
    return undefined
  }

  return packageManifestConflict({
    surfaceId: options.surfaceId,
    path: nextPath,
    existing: options.slots.get(formatJsonPointer(nextPath)) ?? {
      value: currentValue,
      owners: ['<base>'],
    },
    incomingOwner: options.incomingOwner,
    incomingValue: options.incomingValue,
  })
}

function orderPackageManifest(manifest: Record<string, JsonValue>) {
  const ordered: Record<string, JsonValue> = {}
  const preferredKeys = ['name', 'type', 'version', 'packageManager', 'scripts', 'dependencies', 'devDependencies'] as const

  for (const key of preferredKeys) {
    if (Object.hasOwn(manifest, key)) {
      ordered[key] = manifest[key]!
    }
  }

  for (const [key, value] of Object.entries(manifest)) {
    if (!Object.hasOwn(ordered, key)) {
      ordered[key] = value
    }
  }

  return ordered
}

function mergePackageManifestContributions(contributions: readonly PackageManifestContribution[]) {
  const manifest: Record<string, JsonValue> = {}
  const slots = new Map<string, StructuredSlot>()
  const surfaceId = contributions[0]?.surfaceId ?? 'package-manifest:root'

  for (const contribution of contributions) {
    for (const [key, value] of Object.entries(contribution.entries)) {
      const conflict = mergeStructuredValue({
        target: manifest,
        key,
        incomingValue: value,
        incomingOwner: contribution.owner,
        path: [],
        slots,
        surfaceId,
      })

      if (conflict) {
        return Effect.fail(conflict)
      }
    }
  }

  return Effect.succeed(orderPackageManifest(manifest))
}

function materializePackageJson(surfaceId: string, contributions: readonly PackageManifestContribution[]) {
  return Effect.map(mergePackageManifestContributions(contributions), value => ({
    id: 'write-package-json',
    kind: 'writeStructuredFile',
    owner: 'materializer:package-json',
    surfaceId,
    path: 'package.json',
    authority: 'none',
    value,
  } satisfies WriteOperation))
}

function materializeEslintRoot(contributions: readonly EslintRootContribution[]): WriteOperation[] {
  return contributions.map(contribution => ({
    id: 'write-eslint-config',
    kind: 'writeManagedFile',
    owner: 'materializer:eslint-config',
    surfaceId: contribution.surfaceId,
    path: 'eslint.config.mjs',
    authority: 'none',
    content: 'import antfu from \'@antfu/eslint-config\'\n\nexport default antfu()\n',
  }))
}

function materializeKnipRoot(contributions: readonly KnipRootContribution[]): WriteOperation[] {
  return contributions.map(contribution => ({
    id: 'write-knip-config',
    kind: 'writeStructuredFile',
    owner: 'materializer:knip-config',
    surfaceId: contribution.surfaceId,
    path: 'knip.json',
    authority: 'none',
    value: contribution.config,
  }))
}

function materializeGeneratedUserFile(contribution: GeneratedUserFileContribution): WriteOperation {
  if (contribution.surfaceId.includes('/index.html')) {
    return {
      id: 'write-react-index-html',
      kind: 'writeGeneratedUserFile',
      owner: 'materializer:react-app-static',
      surfaceId: contribution.surfaceId,
      path: contribution.path,
      authority: 'none',
      content: contribution.content,
    }
  }

  if (contribution.surfaceId.includes('/src/main.tsx')) {
    return {
      id: 'write-react-main',
      kind: 'writeGeneratedUserFile',
      owner: 'materializer:react-app-static',
      surfaceId: contribution.surfaceId,
      path: contribution.path,
      authority: 'none',
      content: contribution.content,
    }
  }

  if (contribution.path === 'tsconfig.json') {
    return {
      id: 'write-tsconfig',
      kind: 'writeGeneratedUserFile',
      owner: contribution.owner,
      surfaceId: contribution.surfaceId,
      path: contribution.path,
      authority: 'none',
      content: contribution.content,
    }
  }

  return {
    id: 'write-root-source',
    kind: 'writeGeneratedUserFile',
    owner: contribution.owner,
    surfaceId: contribution.surfaceId,
    path: contribution.path,
    authority: 'none',
    content: contribution.content,
  }
}

function unique(values: readonly string[]) {
  return [...new Set(values)]
}

function materializeReactAppShell(contributions: readonly ReactAppShellContribution[]): WriteOperation[] {
  if (contributions.length === 0) {
    return []
  }

  const surfaceId = contributions[0]!.surfaceId
  const imports = unique(contributions.flatMap(contribution => contribution.imports))
  const declarations = contributions.flatMap(contribution => contribution.declarations)
  const bodyContribution = contributions.find(contribution => contribution.owner !== 'capability:react-app')
    ?? contributions[0]!
  const body = bodyContribution.body.join('\n')
  const importBlock = imports.length > 0 ? `${imports.join('\n')}\n\n` : ''
  const declarationBlock = declarations.length > 0 ? `\n${declarations.join('\n')}\n` : ''

  return [{
    id: 'write-react-app-shell',
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:react-app-shell',
    surfaceId,
    path: 'src/App.tsx',
    authority: 'none',
    content: `${importBlock}export function App() {${declarationBlock}
  return (
${body}
  )
}
`,
  }]
}

function providerArtifactPathError(contribution: ProviderArtifactContribution) {
  return new SchemaContractError({
    schema: contribution.surfaceId,
    issueCount: 1,
    message: `Provider ${contribution.providerId} declared unsupported artifact path "${contribution.path}". Provider artifacts must stay under .prelude/providers/${contribution.providerId}/.`,
  })
}

function isProviderNamespacePath(providerId: string, artifactPath: string) {
  if (path.isAbsolute(artifactPath)) {
    return false
  }

  const normalized = path.posix.normalize(artifactPath)
  const providerRoot = `.prelude/providers/${providerId}/`

  return normalized === artifactPath
    && normalized.startsWith(providerRoot)
    && normalized.length > providerRoot.length
    && !normalized.split('/').includes('..')
}

function materializeProviderArtifact(contribution: ProviderArtifactContribution): Effect.Effect<WriteOperation, SchemaContractError> {
  if (!isProviderNamespacePath(contribution.providerId, contribution.path)) {
    return Effect.fail(providerArtifactPathError(contribution))
  }

  return Effect.succeed({
    id: 'write-effect-harness-provider-record',
    kind: 'writeStructuredFile',
    owner: 'materializer:provider-artifact',
    surfaceId: contribution.surfaceId,
    path: contribution.path,
    authority: 'owner',
    value: contribution.value,
  })
}

export function materializeWritePlan(contributions: readonly CapabilityContribution[]): Effect.Effect<WritePlan, SchemaContractError> {
  const packageManifestContributions = contributions.filter(
    (contribution): contribution is PackageManifestContribution => contribution.kind === 'packageManifest',
  )
  const eslintRootContributions = contributions.filter(
    (contribution): contribution is EslintRootContribution => contribution.kind === 'eslintRoot',
  )
  const knipRootContributions = contributions.filter(
    (contribution): contribution is KnipRootContribution => contribution.kind === 'knipRoot',
  )
  const sourceContributions = contributions.filter(
    (contribution): contribution is GeneratedUserFileContribution => contribution.kind === 'generatedUserFile',
  )
  const reactAppShellContributions = contributions.filter(
    (contribution): contribution is ReactAppShellContribution => contribution.kind === 'reactAppShell',
  )
  const providerArtifactContributions = contributions.filter(
    (contribution): contribution is ProviderArtifactContribution => contribution.kind === 'providerArtifact',
  )
  const packageManifestSurfaces = new Map<string, readonly PackageManifestContribution[]>()

  for (const contribution of packageManifestContributions) {
    const existing = packageManifestSurfaces.get(contribution.surfaceId) ?? []
    packageManifestSurfaces.set(contribution.surfaceId, [...existing, contribution])
  }

  return Effect.gen(function* () {
    const packageJsonOperations = yield* Effect.all(
      [...packageManifestSurfaces.entries()].map(([surfaceId, surfaceContributions]) =>
        materializePackageJson(surfaceId, surfaceContributions)),
    )
    const providerArtifactOperations = yield* Effect.all(
      providerArtifactContributions.map(materializeProviderArtifact),
    )

    return {
      operations: [
        ...packageJsonOperations,
        ...materializeEslintRoot(eslintRootContributions),
        ...materializeKnipRoot(knipRootContributions),
        ...sourceContributions.map(materializeGeneratedUserFile),
        ...materializeReactAppShell(reactAppShellContributions),
        ...providerArtifactOperations,
      ],
    }
  })
}
