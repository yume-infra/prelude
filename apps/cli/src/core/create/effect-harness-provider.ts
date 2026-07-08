import type {
  CapabilityContribution,
  EffectHarnessProviderDiscovery,
  JsonValue,
  LifecycleProviderRecord,
  LifecycleSurfaceRecord,
  MaintainProviderReference,
  ProviderArtifactRecord,
  ProviderProjectedContext,
  ResolvedGraph,
  ResolvedProvider,
  VerificationRecord,
} from './model'
import { pathJoin } from '@/core/path-utils'
import { eslintProviderHookBlock, eslintProviderHookEndMarker, eslintProviderHookStartMarker } from './eslint-provider-hook'

const effectHarnessProviderId = 'effect-harness'
const effectHarnessProviderPath = '.prelude/providers/effect-harness/provider.json'
export const effectHarnessVerificationId = 'provider:effect-harness:create-contract'

function jsonRecord(value: unknown): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>
}

function cloneJsonValue(value: JsonValue): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

function isJsonRecord(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requiredJsonRecord(value: JsonValue | undefined, source: string): Record<string, JsonValue> {
  if (!isJsonRecord(value)) {
    throw new Error(`Invalid effect-harness provider discovery: expected ${source} JSON object`)
  }

  return value
}

function requiredString(value: JsonValue | undefined, source: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid effect-harness provider discovery: expected ${source} string`)
  }

  return value
}

function requiredStringArray(value: JsonValue | undefined, source: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`Invalid effect-harness provider discovery: expected ${source} string array`)
  }

  return value.map((entry, index) => requiredString(entry, `${source}[${index}]`))
}

function optionalStringArray(value: JsonValue | undefined, source: string): readonly string[] {
  if (value === undefined) {
    return []
  }

  return requiredStringArray(value, source)
}

function optionalString(value: JsonValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function optionalBoolean(value: JsonValue | undefined): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function jsonPointerSegment(value: string) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function targetManagedContributions(discovery: EffectHarnessProviderDiscovery) {
  return requiredJsonRecord(discovery.targetManagedSurfaces.contributions, 'targetManagedSurfaces.contributions')
}

function targetManagedContribution(discovery: EffectHarnessProviderDiscovery, key: string) {
  return requiredJsonRecord(targetManagedContributions(discovery)[key], `targetManagedSurfaces.contributions.${key}`)
}

function effectHarnessPackageJsonContribution(discovery: EffectHarnessProviderDiscovery) {
  return targetManagedContribution(discovery, 'packageJson')
}

function effectHarnessTsconfigContribution(discovery: EffectHarnessProviderDiscovery) {
  return targetManagedContribution(discovery, 'tsconfig')
}

function effectHarnessPolicyContributions(discovery: EffectHarnessProviderDiscovery) {
  const contributions = targetManagedContributions(discovery)

  return {
    editorPolicy: requiredJsonRecord(contributions.editorPolicy, 'targetManagedSurfaces.contributions.editorPolicy'),
    lintGuardrails: requiredJsonRecord(contributions.lintGuardrails, 'targetManagedSurfaces.contributions.lintGuardrails'),
    testPolicy: requiredJsonRecord(contributions.testPolicy, 'targetManagedSurfaces.contributions.testPolicy'),
    verificationPolicy: requiredJsonRecord(contributions.verificationPolicy, 'targetManagedSurfaces.contributions.verificationPolicy'),
  }
}

function targetManagedFilesContribution(discovery: EffectHarnessProviderDiscovery, key: 'documentationBundle' | 'snippets') {
  return requiredJsonRecord(discovery.targetManagedSurfaces[key], `targetManagedSurfaces.${key}`)
}

function effectHarnessPackageDependencyGroups(discovery: EffectHarnessProviderDiscovery) {
  return requiredJsonRecord(effectHarnessPackageJsonContribution(discovery).dependencyGroups, 'targetManagedSurfaces.contributions.packageJson.dependencyGroups')
}

function effectHarnessPackageScripts(discovery: EffectHarnessProviderDiscovery) {
  return requiredJsonRecord(effectHarnessPackageJsonContribution(discovery).scripts, 'targetManagedSurfaces.contributions.packageJson.scripts')
}

function effectHarnessPackageBaseline(discovery: EffectHarnessProviderDiscovery): Record<string, JsonValue> {
  const packageBaseline: Record<string, JsonValue> = {}

  for (const [groupName, groupValue] of Object.entries(effectHarnessPackageDependencyGroups(discovery))) {
    const group = requiredJsonRecord(groupValue, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}`)
    const packages = requiredJsonRecord(group.packages, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.packages`)

    for (const [packageName, version] of Object.entries(packages)) {
      packageBaseline[packageName] = requiredString(version, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.packages.${packageName}`)
    }
  }

  return packageBaseline
}

export function effectHarnessTypecheckCommandForDiscovery(discovery: EffectHarnessProviderDiscovery) {
  const scripts = effectHarnessPackageScripts(discovery)
  const typecheck = requiredJsonRecord(scripts.typecheck, 'targetManagedSurfaces.contributions.packageJson.scripts.typecheck')

  return requiredString(typecheck.defaultCommand, 'targetManagedSurfaces.contributions.packageJson.scripts.typecheck.defaultCommand')
}

function effectHarnessLanguageServiceFloatingEffect(discovery: EffectHarnessProviderDiscovery) {
  const [plugin] = effectHarnessTsgoPluginForDiscovery(discovery)
  const pluginRecord = requiredJsonRecord(plugin, 'targetManagedSurfaces.contributions.tsconfig.compilerOptions.plugins[0]')
  const diagnosticSeverity = requiredJsonRecord(pluginRecord.diagnosticSeverity, 'targetManagedSurfaces.contributions.tsconfig.compilerOptions.plugins[0].diagnosticSeverity')

  return optionalString(diagnosticSeverity.floatingEffect) ?? 'error'
}

export function effectHarnessTsgoPluginForDiscovery(discovery: EffectHarnessProviderDiscovery): readonly JsonValue[] {
  const tsconfig = effectHarnessTsconfigContribution(discovery)
  const compilerOptions = requiredJsonRecord(tsconfig.compilerOptions, 'targetManagedSurfaces.contributions.tsconfig.compilerOptions')
  const plugins = compilerOptions.plugins

  if (!Array.isArray(plugins)) {
    throw new TypeError('Invalid effect-harness provider discovery: expected targetManagedSurfaces.contributions.tsconfig.compilerOptions.plugins array')
  }

  return plugins
}

export function effectHarnessProviderVerificationCommands(discovery: EffectHarnessProviderDiscovery, graph?: ResolvedGraph): readonly string[] {
  const { verificationPolicy } = effectHarnessPolicyContributions(discovery)
  const localCommands = requiredJsonRecord(verificationPolicy.localCommands, 'targetManagedSurfaces.contributions.verificationPolicy.localCommands')
  const commandGroups = ['diagnostics', 'tests', 'lint'] as const

  return commandGroups.flatMap(group =>
    requiredStringArray(localCommands[group], `targetManagedSurfaces.contributions.verificationPolicy.localCommands.${group}`)
      .map(command => graph?.topology === 'workspace' && command === 'pnpm test' ? 'pnpm -r --if-present test' : command))
}

export function effectHarnessProviderLintCommand(discovery: EffectHarnessProviderDiscovery) {
  const { lintGuardrails } = effectHarnessPolicyContributions(discovery)

  return requiredString(lintGuardrails.command, 'targetManagedSurfaces.contributions.lintGuardrails.command')
}

export function effectHarnessProviderLintPackageEntries(discovery: EffectHarnessProviderDiscovery): Record<string, JsonValue> {
  const dependencyGroups = effectHarnessPackageDependencyGroups(discovery)
  const lintingGroup = requiredJsonRecord(dependencyGroups.linting, 'targetManagedSurfaces.contributions.packageJson.dependencyGroups.linting')
  const lintingField = requiredString(lintingGroup.field, 'targetManagedSurfaces.contributions.packageJson.dependencyGroups.linting.field')
  const lintingPackages = requiredJsonRecord(lintingGroup.packages, 'targetManagedSurfaces.contributions.packageJson.dependencyGroups.linting.packages')
  const scripts = effectHarnessPackageScripts(discovery)
  const lintScript = requiredJsonRecord(scripts.lint, 'targetManagedSurfaces.contributions.packageJson.scripts.lint')

  return {
    scripts: {
      lint: requiredString(lintScript.defaultCommand, 'targetManagedSurfaces.contributions.packageJson.scripts.lint.defaultCommand'),
    },
    [lintingField]: Object.fromEntries(
      Object.entries(lintingPackages).map(([name, version]) => [
        name,
        requiredString(version, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.linting.packages.${name}`),
      ]),
    ) as Record<string, JsonValue>,
  }
}

function effectHarnessArtifact(discovery: EffectHarnessProviderDiscovery): ProviderArtifactRecord {
  return {
    id: discovery.provider.id,
    version: discovery.provider.providerVersion,
    providerProfileRelativePath: discovery.providerProfileRelativePath,
    packageLocator: jsonRecord(discovery.packageLocator),
    artifactOnlyReferences: jsonRecord(discovery.artifactOnlyReferences),
    sourceIdentities: jsonRecord(discovery.sourceIdentities),
  } satisfies ProviderArtifactRecord
}

function effectHarnessRuntime(discovery: EffectHarnessProviderDiscovery) {
  return {
    commands: {
      discover: discovery.packageLocator.discoveryCommand,
    },
    routes: {
      providerProfile: discovery.providerProfileRelativePath,
    },
    files: [],
    discovery: discovery.discovery,
    deliveryModes: discovery.deliveryModes,
    targetManagedSurfaces: discovery.targetManagedSurfaces,
    internalHarnessSurfaces: discovery.internalHarnessSurfaces,
  } as const satisfies LifecycleProviderRecord['runtime']
}

export function effectHarnessResolvedProvider(discovery: EffectHarnessProviderDiscovery, packageScopes: string | readonly string[]): ResolvedProvider {
  return {
    id: discovery.provider.id,
    contractVersion: discovery.provider.contractVersion,
    artifactVersion: discovery.provider.providerVersion,
    packageScopes: typeof packageScopes === 'string' ? [packageScopes] : [...packageScopes],
  }
}

export function hasEffectHarnessProvider(graph: ResolvedGraph) {
  return graph.providers.some(provider => provider.id === effectHarnessProviderId)
}

function effectHarnessProjectedContext(graph: ResolvedGraph): ProviderProjectedContext {
  return {
    topology: graph.topology,
    packageScopes: graph.providers.find(provider => provider.id === effectHarnessProviderId)?.packageScopes ?? [],
    packagePaths: Object.fromEntries(graph.packages.map(pkg => [pkg.id, pkg.path])),
    rootCapabilities: graph.rootCapabilities,
    packageCapabilities: graph.packageCapabilities,
  }
}

function packagePathForProjectedScope(projectedContext: ProviderProjectedContext, scope: string) {
  const explicitPath = projectedContext.packagePaths?.[scope]
  if (explicitPath !== undefined) {
    return explicitPath
  }

  const capabilities = projectedContext.packageCapabilities[scope] ?? []
  return capabilities.includes('library') ? `libs/${scope}` : `apps/${scope}`
}

function normalizeProjectedContext(projectedContext: ProviderProjectedContext): ProviderProjectedContext {
  if (projectedContext.topology !== 'workspace') {
    return {
      ...projectedContext,
      packagePaths: projectedContext.packagePaths ?? {},
    }
  }

  return {
    ...projectedContext,
    packagePaths: Object.fromEntries(
      projectedContext.packageScopes.map(scope => [scope, packagePathForProjectedScope(projectedContext, scope)]),
    ),
  }
}

function discoveryManagedFileContent(file: Record<string, JsonValue>, source: string) {
  const inlineContent = optionalString(file.content)
  if (inlineContent !== undefined) {
    return inlineContent
  }

  throw new TypeError(`Invalid effect-harness provider discovery: expected ${source}.content string`)
}

function effectHarnessManagedFilesContribution(discovery: EffectHarnessProviderDiscovery, key: 'documentationBundle' | 'snippets') {
  const contribution = targetManagedFilesContribution(discovery, key)
  const targetBasePath = requiredString(contribution.targetBasePath, `targetManagedSurfaces.${key}.targetBasePath`)
  const files = contribution.files

  if (!Array.isArray(files)) {
    throw new TypeError(`Invalid effect-harness provider discovery: expected targetManagedSurfaces.${key}.files array`)
  }

  return files.map((fileValue, index) => {
    const source = `targetManagedSurfaces.${key}.files[${index}]`
    const file = requiredJsonRecord(fileValue, source)
    const targetPath = requiredString(file.targetPath, `${source}.targetPath`)
    const pathInTarget = pathJoin(targetBasePath, targetPath)

    return {
      path: pathInTarget,
      content: discoveryManagedFileContent(file, source),
    }
  })
}

function effectHarnessDiscoveryManagedFileArtifacts(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext) {
  return [
    effectHarnessEslintConfigArtifact(discovery, projectedContext),
    ...effectHarnessManagedFilesContribution(discovery, 'documentationBundle'),
    ...effectHarnessManagedFilesContribution(discovery, 'snippets'),
  ]
}

function effectHarnessManagedFileSurfaceId(filePath: string) {
  return `provider-managed-file:effect-harness:${filePath}`
}

function managedFileOperationId(filePath: string) {
  const slug = filePath.replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '')
  return `write-effect-harness-${slug}`
}

const effectHarnessEslintConfigPath = '.prelude/providers/effect-harness/eslint.config.mjs'
const effectHarnessRootEslintConfigPath = 'eslint.config.mjs'
const effectHarnessEslintProviderHookSurfaceId = 'provider-managed-block:effect-harness:eslint.config.mjs#provider-config'

function effectHarnessRootEslintProviderConfigImport() {
  return `./${effectHarnessEslintConfigPath}`
}

function effectHarnessRootEslintProviderHookBlock() {
  return eslintProviderHookBlock([effectHarnessRootEslintProviderConfigImport()])
}

function restrictedImportMessage(name: string) {
  if (name === 'node:test' || name === 'vitest') {
    return 'Use @effect/vitest for Effect harness tests.'
  }

  if (name === '@effect/cli' || name.startsWith('@effect/cli/')) {
    return 'Use effect/unstable/cli for Effect v4 beta.'
  }

  if (name.includes('repos/effect')) {
    return 'repos/effect is read-only reference material; import installed packages instead.'
  }

  if (name.includes('repos/tsgo')) {
    return 'repos/tsgo is read-only reference material; use installed packages and CLI instead.'
  }

  return 'This import is blocked by the effect-harness provider guardrails.'
}

function restrictedImportPatterns(imports: readonly string[]) {
  return imports
    .filter(name => name.includes('*'))
    .flatMap((name) => {
      const group = name.startsWith('repos/')
        ? [name, `**/${name}`]
        : [name]
      return group.map(pattern => ({
        group: [pattern],
        message: restrictedImportMessage(pattern),
      }))
    })
}

interface RestrictedImportPathRule {
  readonly importNames?: readonly string[]
  readonly message: string
  readonly name: string
}

function restrictedImportPaths(imports: readonly string[], restrictedVitestImports: readonly string[]): RestrictedImportPathRule[] {
  const paths: RestrictedImportPathRule[] = imports
    .filter(name => !name.includes('*') && !(name === 'vitest' && restrictedVitestImports.length > 0))
    .map(name => ({
      name,
      message: restrictedImportMessage(name),
    }))

  if (restrictedVitestImports.length > 0) {
    paths.push({
      name: 'vitest',
      importNames: [...restrictedVitestImports],
      message: 'Use @effect/vitest for Effect test entries. Import Vitest mock and lifecycle APIs directly from vitest when the runner requires it.',
    })
  }

  return paths
}

function restrictedSyntaxRules(restrictedSyntax: readonly string[]) {
  const rules: { readonly selector: string, readonly message: string }[] = []

  if (restrictedSyntax.includes('Context.Tag')) {
    rules.push({
      selector: 'MemberExpression[object.name="Context"][property.name="Tag"]',
      message: 'Use Context.Service for v4 beta service definitions.',
    })
  }

  const bannedEffectMembers = restrictedSyntax
    .filter(rule => rule.startsWith('Effect.'))
    .map(rule => rule.slice('Effect.'.length))

  if (bannedEffectMembers.length > 0) {
    rules.push({
      selector: `MemberExpression[object.name="Effect"][property.name=/^(${bannedEffectMembers.join('|')})$/]`,
      message: 'This Effect member is banned by the harness guardrails; use the Effect-native safer pattern.',
    })
  }

  return rules
}

function jsLiteral(value: unknown, indentation: number) {
  const padding = ' '.repeat(indentation)
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((line, index) => index === 0 ? line : `${padding}${line}`)
    .join('\n')
}

function effectHarnessPackageManifestPaths(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext) {
  return [...new Set(effectHarnessPackageSurfacesForProjectedContext(discovery, projectedContext).map(surface => surface.path))]
}

function effectHarnessEslintConfigContent(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext) {
  const { lintGuardrails } = effectHarnessPolicyContributions(discovery)
  const rules = requiredJsonRecord(lintGuardrails.rules, 'targetManagedSurfaces.contributions.lintGuardrails.rules')
  const restrictedImports = requiredStringArray(rules.restrictedImports, 'targetManagedSurfaces.contributions.lintGuardrails.rules.restrictedImports')
  const restrictedVitestImports = optionalStringArray(rules.restrictedVitestImports, 'targetManagedSurfaces.contributions.lintGuardrails.rules.restrictedVitestImports')
  const restrictedSyntax = requiredStringArray(rules.restrictedSyntax, 'targetManagedSurfaces.contributions.lintGuardrails.rules.restrictedSyntax')
  const packageManifestPaths = effectHarnessPackageManifestPaths(discovery, projectedContext)
  const syntaxRules = restrictedSyntaxRules(restrictedSyntax)
  const testSyntaxRules = restrictedSyntax.includes('plain it() in tests')
    ? [
        ...syntaxRules,
        {
          selector: 'CallExpression[callee.name="it"]',
          message: 'Use it.effect, it.live, or layer from @effect/vitest for Effect harness tests.',
        },
      ]
    : syntaxRules

  return `const noDisableValidationRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow disabling Effect Schema validation.',
    },
    messages: {
      noDisableValidation: 'Do not use { disableValidation: true }. Fix the data or schema instead of disabling validation.',
    },
    schema: [],
  },
  create(context) {
    return {
      Property(node) {
        if (
          node.key
          && (
            (node.key.type === 'Identifier' && node.key.name === 'disableValidation')
            || (node.key.type === 'Literal' && node.key.value === 'disableValidation')
          )
          && node.value
          && node.value.type === 'Literal'
          && node.value.value === true
        ) {
          context.report({
            node,
            messageId: 'noDisableValidation',
          })
        }
      },
    }
  },
}

const localPlugin = {
  rules: {
    'no-disable-validation': noDisableValidationRule,
  },
}

export default [
  {
    name: 'effect-harness/package-baseline',
    files: ${jsLiteral(packageManifestPaths, 4)},
    rules: {
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    name: 'effect-harness/source',
    files: ['**/bin/**/*.ts', '**/src/**/*.ts', '**/tests/**/*.{js,mjs,ts}'],
    plugins: {
      local: localPlugin,
    },
    rules: {
      'local/no-disable-validation': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: ${jsLiteral(restrictedImportPaths(restrictedImports, restrictedVitestImports), 10)},
          patterns: ${jsLiteral(restrictedImportPatterns(restrictedImports), 10)},
        },
      ],
      'no-restricted-syntax': [
        'error',
${syntaxRules.map(rule => `        ${JSON.stringify(rule)},`).join('\n')}
      ],
      'test/no-import-node-test': 'off',
    },
  },
  {
    name: 'effect-harness/effect-vitest-tests',
    files: ['**/tests/**/*.test.{js,mjs,ts}'],
    rules: {
      'no-restricted-syntax': [
        'error',
${testSyntaxRules.map(rule => `        ${JSON.stringify(rule)},`).join('\n')}
      ],
    },
  },
]
`
}

function effectHarnessEslintConfigArtifact(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext) {
  return {
    path: effectHarnessEslintConfigPath,
    content: effectHarnessEslintConfigContent(discovery, projectedContext),
  }
}

function packagePointerSurfaceId(targetPath: string, pointer: string) {
  const scope = targetPath === 'package.json' ? 'root' : targetPath.replace(/\/package\.json$/u, '')
  return `package-manifest:${scope}:${pointer}`
}

function tsconfigPointerSurfaceId(targetPath: string, pointer: string) {
  const scope = targetPath === 'tsconfig.json' ? 'root' : targetPath.replace(/\/tsconfig\.json$/u, '')
  return `tsconfig:${scope}:${pointer}`
}

function editorSettingsSurfaceId(targetPath: string) {
  return `editor-settings:${targetPath}`
}

function editorSettingsPointerSurfaceId(targetPath: string, pointer: string) {
  return `${editorSettingsSurfaceId(targetPath)}:${pointer}`
}

type PackageSurfaceInput
  = | {
    readonly kind: 'dependency'
    readonly groupName: string
    readonly packageName: string
  }
  | {
    readonly kind: 'script'
    readonly scriptName: string
  }

function effectHarnessPackageSurfacesForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext) {
  if (projectedContext.topology !== 'workspace') {
    return effectHarnessPackageSurfaces(discovery, 'package.json')
  }

  return [
    ...effectHarnessPackageSurfaces(discovery, 'package.json', input =>
      (input.kind === 'dependency' && input.groupName === 'linting')
      || (input.kind === 'script' && input.scriptName === 'lint')),
    ...projectedContext.packageScopes.flatMap((scope) => {
      const packagePath = projectedContext.packagePaths?.[scope]
      return packagePath === undefined
        ? []
        : effectHarnessPackageSurfaces(discovery, `${packagePath}/package.json`, input =>
            !((input.kind === 'dependency' && input.groupName === 'linting') || (input.kind === 'script' && input.scriptName === 'lint')))
    }),
  ]
}

function effectHarnessTsconfigSurfacesForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext) {
  if (projectedContext.topology !== 'workspace') {
    return effectHarnessTsconfigSurfaces(discovery, 'tsconfig.json')
  }

  return projectedContext.packageScopes.flatMap((scope) => {
    const packagePath = projectedContext.packagePaths?.[scope]
    return packagePath === undefined
      ? []
      : effectHarnessTsconfigSurfaces(discovery, `${packagePath}/tsconfig.json`)
  })
}

interface EditorSettingsProjection {
  readonly path: string
  readonly value: Record<string, JsonValue>
  readonly surfaces: readonly { readonly id: string, readonly path: string, readonly pointer: string, readonly value: JsonValue }[]
}

function mergeJsonRecord(target: Record<string, JsonValue>, source: Record<string, JsonValue>) {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key]
    if (isJsonRecord(current) && isJsonRecord(value)) {
      mergeJsonRecord(current, value)
      continue
    }

    target[key] = cloneJsonValue(value)
  }
}

function shouldProjectEditorPolicy(policy: Record<string, JsonValue>) {
  if (optionalString(policy.level) === 'preference') {
    return false
  }

  return optionalBoolean(policy.requiresExplicitOptIn) !== true
}

function effectHarnessEditorPolicies(discovery: EffectHarnessProviderDiscovery) {
  const { editorPolicy } = effectHarnessPolicyContributions(discovery)
  return requiredJsonRecord(editorPolicy.policies, 'targetManagedSurfaces.contributions.editorPolicy.policies')
}

function effectHarnessEditorPolicyTargetPaths(discovery: EffectHarnessProviderDiscovery) {
  const { editorPolicy } = effectHarnessPolicyContributions(discovery)
  return requiredStringArray(editorPolicy.targetPaths, 'targetManagedSurfaces.contributions.editorPolicy.targetPaths')
}

function effectHarnessVscodeEditorSettings(discovery: EffectHarnessProviderDiscovery): EditorSettingsProjection | undefined {
  const targetPath = '.vscode/settings.json'
  if (!effectHarnessEditorPolicyTargetPaths(discovery).includes(targetPath)) {
    return undefined
  }

  const value: Record<string, JsonValue> = {}
  const surfaces: Array<{ readonly id: string, readonly path: string, readonly pointer: string, readonly value: JsonValue }> = []

  for (const [policyName, policyValue] of Object.entries(effectHarnessEditorPolicies(discovery))) {
    const policy = requiredJsonRecord(policyValue, `targetManagedSurfaces.contributions.editorPolicy.policies.${policyName}`)
    if (!shouldProjectEditorPolicy(policy)) {
      continue
    }

    const vscode = policy.vscode
    if (!isJsonRecord(vscode)) {
      continue
    }

    for (const [settingKey, settingValue] of Object.entries(vscode)) {
      const pointer = `/${jsonPointerSegment(settingKey)}`
      value[settingKey] = cloneJsonValue(settingValue)
      surfaces.push({
        id: editorSettingsPointerSurfaceId(targetPath, pointer),
        path: targetPath,
        pointer,
        value: settingValue,
      })
    }
  }

  return surfaces.length === 0 ? undefined : { path: targetPath, value, surfaces }
}

function effectHarnessZedEditorSettings(discovery: EffectHarnessProviderDiscovery): EditorSettingsProjection | undefined {
  const targetPath = '.zed/settings.json'
  if (!effectHarnessEditorPolicyTargetPaths(discovery).includes(targetPath)) {
    return undefined
  }

  const value: Record<string, JsonValue> = {}
  const surfaces: Array<{ readonly id: string, readonly path: string, readonly pointer: string, readonly value: JsonValue }> = []
  const fileScanExclusions = new Set<string>()

  for (const [policyName, policyValue] of Object.entries(effectHarnessEditorPolicies(discovery))) {
    const policy = requiredJsonRecord(policyValue, `targetManagedSurfaces.contributions.editorPolicy.policies.${policyName}`)
    if (!shouldProjectEditorPolicy(policy)) {
      continue
    }

    const zed = policy.zed
    if (!isJsonRecord(zed)) {
      continue
    }

    const lsp = zed.lsp
    if (isJsonRecord(lsp)) {
      mergeJsonRecord(value, { lsp })
      const typeScriptLanguageServer = requiredJsonRecord(lsp['typescript-language-server'], `targetManagedSurfaces.contributions.editorPolicy.policies.${policyName}.zed.lsp.typescript-language-server`)
      const initializationOptions = requiredJsonRecord(typeScriptLanguageServer.initialization_options, `targetManagedSurfaces.contributions.editorPolicy.policies.${policyName}.zed.lsp.typescript-language-server.initialization_options`)
      const preferences = requiredJsonRecord(initializationOptions.preferences, `targetManagedSurfaces.contributions.editorPolicy.policies.${policyName}.zed.lsp.typescript-language-server.initialization_options.preferences`)
      const autoImportFileExcludePatterns = requiredStringArray(
        preferences.autoImportFileExcludePatterns,
        `targetManagedSurfaces.contributions.editorPolicy.policies.${policyName}.zed.lsp.typescript-language-server.initialization_options.preferences.autoImportFileExcludePatterns`,
      )
      const pointer = '/lsp/typescript-language-server/initialization_options/preferences/autoImportFileExcludePatterns'
      surfaces.push({
        id: editorSettingsPointerSurfaceId(targetPath, pointer),
        path: targetPath,
        pointer,
        value: autoImportFileExcludePatterns,
      })
    }

    if (optionalString(zed.setting) === 'file_scan_exclusions') {
      for (const pattern of requiredStringArray(zed.patterns, `targetManagedSurfaces.contributions.editorPolicy.policies.${policyName}.zed.patterns`)) {
        fileScanExclusions.add(pattern)
      }
    }
  }

  if (fileScanExclusions.size > 0) {
    const exclusions = [...fileScanExclusions]
    value.file_scan_exclusions = exclusions
    surfaces.push({
      id: editorSettingsPointerSurfaceId(targetPath, '/file_scan_exclusions'),
      path: targetPath,
      pointer: '/file_scan_exclusions',
      value: exclusions,
    })
  }

  return surfaces.length === 0 ? undefined : { path: targetPath, value, surfaces }
}

function effectHarnessEditorSettingsProjections(discovery: EffectHarnessProviderDiscovery): readonly EditorSettingsProjection[] {
  return [
    effectHarnessVscodeEditorSettings(discovery),
    effectHarnessZedEditorSettings(discovery),
  ].filter((projection): projection is EditorSettingsProjection => projection !== undefined)
}

function lifecycleSurfaceMetadata(input: {
  readonly discovery: EffectHarnessProviderDiscovery
  readonly id: string
  readonly scope: 'entry' | 'file'
  readonly locator: string
  readonly base?: string
}) {
  return {
    id: input.id,
    owner: 'provider:effect-harness',
    lifecycle: 'managed',
    scope: input.scope,
    locator: input.locator,
    conflictPolicy: 'block',
    contractVersion: input.discovery.provider.contractVersion,
    implementationVersion: input.discovery.provider.providerVersion,
    ...(input.base === undefined ? {} : { base: input.base, snapshot: input.base }),
  } as const
}

function snapshotJsonValue(value: JsonValue) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function effectHarnessPackageSurfaces(
  discovery: EffectHarnessProviderDiscovery,
  targetPath: string,
  include: (input: PackageSurfaceInput) => boolean = () => true,
) {
  const surfaces: { readonly id: string, readonly path: string, readonly pointer: string, readonly value: JsonValue }[] = []

  for (const [groupName, groupValue] of Object.entries(effectHarnessPackageDependencyGroups(discovery))) {
    const group = requiredJsonRecord(groupValue, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}`)
    const field = requiredString(group.field, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.field`)
    const packages = requiredJsonRecord(group.packages, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.packages`)

    if (field !== 'dependencies' && field !== 'devDependencies') {
      throw new Error(`Invalid effect-harness provider discovery: unsupported packageJson dependency field ${field}`)
    }

    for (const [packageName, version] of Object.entries(packages)) {
      if (!include({ kind: 'dependency', groupName, packageName })) {
        continue
      }

      const pointer = `/${field}/${jsonPointerSegment(packageName)}`
      surfaces.push({
        id: packagePointerSurfaceId(targetPath, pointer),
        path: targetPath,
        pointer,
        value: requiredString(version, `targetManagedSurfaces.contributions.packageJson.dependencyGroups.${groupName}.packages.${packageName}`),
      })
    }
  }

  for (const [scriptName, scriptValue] of Object.entries(effectHarnessPackageScripts(discovery))) {
    if (!include({ kind: 'script', scriptName })) {
      continue
    }

    const script = requiredJsonRecord(scriptValue, `targetManagedSurfaces.contributions.packageJson.scripts.${scriptName}`)
    const pointer = `/scripts/${jsonPointerSegment(scriptName)}`
    surfaces.push({
      id: packagePointerSurfaceId(targetPath, pointer),
      path: targetPath,
      pointer,
      value: requiredString(script.defaultCommand, `targetManagedSurfaces.contributions.packageJson.scripts.${scriptName}.defaultCommand`),
    })
  }

  return surfaces
}

function effectHarnessTsconfigSurfaces(discovery: EffectHarnessProviderDiscovery, targetPath: string) {
  return [
    {
      id: tsconfigPointerSurfaceId(targetPath, '/compilerOptions/plugins'),
      path: targetPath,
      pointer: '/compilerOptions/plugins',
      value: effectHarnessTsgoPluginForDiscovery(discovery),
    },
  ] as const satisfies readonly { readonly id: string, readonly path: string, readonly pointer: string, readonly value: JsonValue }[]
}

function effectHarnessLifecycleSurfacesForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext): readonly LifecycleSurfaceRecord[] {
  return [
    ...effectHarnessPackageSurfacesForProjectedContext(discovery, projectedContext).map(surface =>
      structuredPointerSurface({
        discovery,
        surface,
        path: surface.path,
        locator: `${surface.path}#${surface.pointer}`,
        operationId: 'write-package-json',
      })),
    ...effectHarnessTsconfigSurfacesForProjectedContext(discovery, projectedContext).map(surface =>
      structuredPointerSurface({
        discovery,
        surface,
        path: surface.path,
        locator: `${surface.path}#${surface.pointer}`,
        operationId: 'write-tsconfig',
      })),
    ...effectHarnessEditorSettingsProjections(discovery).flatMap(projection =>
      projection.surfaces.map(surface =>
        structuredPointerSurface({
          discovery,
          surface,
          path: surface.path,
          locator: `${surface.path}#${surface.pointer}`,
          operationId: `write-editor-settings:${surface.path}`,
        }))),
    managedBlockSurface({
      discovery,
      id: effectHarnessEslintProviderHookSurfaceId,
      path: effectHarnessRootEslintConfigPath,
      locator: `${effectHarnessRootEslintConfigPath}#provider-config`,
      startMarker: eslintProviderHookStartMarker,
      endMarker: eslintProviderHookEndMarker,
      base: effectHarnessRootEslintProviderHookBlock(),
      operationId: 'write-eslint-config',
    }),
    ...effectHarnessDiscoveryManagedFileArtifacts(discovery, projectedContext).map(artifact =>
      ownedFileSurface({
        discovery,
        id: effectHarnessManagedFileSurfaceId(artifact.path),
        path: artifact.path,
        base: artifact.content,
        operationId: managedFileOperationId(artifact.path),
      })),
  ]
}

function structuredPointerSurface(input: {
  readonly discovery: EffectHarnessProviderDiscovery
  readonly surface: { readonly id: string, readonly pointer: string, readonly value: JsonValue }
  readonly path: string
  readonly locator: string
  readonly operationId: string
}): LifecycleSurfaceRecord {
  const snapshot = snapshotJsonValue(input.surface.value)

  return {
    ...lifecycleSurfaceMetadata({
      discovery: input.discovery,
      id: input.surface.id,
      scope: 'entry',
      locator: input.locator,
      base: snapshot,
    }),
    authority: 'bounded',
    kind: 'structuredPointer',
    path: input.path,
    pointer: input.surface.pointer,
    base: snapshot,
    snapshot,
    operationId: input.operationId,
  }
}

function managedBlockSurface(input: {
  readonly discovery: EffectHarnessProviderDiscovery
  readonly id: string
  readonly path: string
  readonly locator: string
  readonly startMarker: string
  readonly endMarker: string
  readonly base: string
  readonly operationId: string
}): LifecycleSurfaceRecord {
  return {
    ...lifecycleSurfaceMetadata({
      discovery: input.discovery,
      id: input.id,
      scope: 'entry',
      locator: input.locator,
      base: input.base,
    }),
    authority: 'bounded',
    kind: 'managedBlock',
    path: input.path,
    startMarker: input.startMarker,
    endMarker: input.endMarker,
    base: input.base,
    snapshot: input.base,
    operationId: input.operationId,
  }
}

function ownedFileSurface(input: {
  readonly discovery: EffectHarnessProviderDiscovery
  readonly id: string
  readonly path: string
  readonly base: string
  readonly operationId: string
}): LifecycleSurfaceRecord {
  return {
    ...lifecycleSurfaceMetadata({
      discovery: input.discovery,
      id: input.id,
      scope: 'file',
      locator: input.path,
      base: input.base,
    }),
    authority: 'owner',
    kind: 'ownedFile',
    path: input.path,
    operationId: input.operationId,
  }
}

export function effectHarnessLifecycleProviderRecord(discovery: EffectHarnessProviderDiscovery, graph: ResolvedGraph): LifecycleProviderRecord {
  return effectHarnessProviderRecordForProjectedContext(discovery, effectHarnessProjectedContext(graph))
}

export function effectHarnessMaintainProviderReference(record: LifecycleProviderRecord): MaintainProviderReference {
  return {
    id: record.id,
    contractVersion: record.contractVersion,
    providerVersion: record.providerVersion,
    profile: record.profile,
    recordPath: effectHarnessProviderPath,
  }
}

export function effectHarnessProviderRecordForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext): LifecycleProviderRecord {
  const normalizedProjectedContext = normalizeProjectedContext(projectedContext)
  const surfaces = effectHarnessLifecycleSurfacesForProjectedContext(discovery, normalizedProjectedContext)
  const artifact = effectHarnessArtifact(discovery)

  return {
    schemaVersion: 1,
    id: discovery.provider.id,
    contractVersion: discovery.provider.contractVersion,
    providerVersion: discovery.provider.providerVersion,
    profile: discovery.selectedProfile,
    artifact,
    projectedContext: normalizedProjectedContext,
    options: {
      lifecycleOwner: optionalString(discovery.discovery.targetLifecycleOwner) ?? 'prelude',
      effect: {
        major: 4,
        packageBaseline: effectHarnessPackageBaseline(discovery),
      },
      languageService: {
        enabled: effectHarnessTsgoPluginForDiscovery(discovery).length > 0,
        floatingEffect: effectHarnessLanguageServiceFloatingEffect(discovery),
      },
      packageScopes: normalizedProjectedContext.packageScopes,
      policies: effectHarnessPolicyContributions(discovery),
    },
    runtime: effectHarnessRuntime(discovery),
    surfaces,
    verificationRecordId: effectHarnessVerificationId,
  }
}

export function effectHarnessVerificationRecord(): VerificationRecord {
  return {
    id: effectHarnessVerificationId,
    status: 'passed',
    checkedPaths: ['package.json', effectHarnessProviderPath],
  }
}

function providerJsonValueForProjectedContext(discovery: EffectHarnessProviderDiscovery, projectedContext: ProviderProjectedContext): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(effectHarnessProviderRecordForProjectedContext(discovery, projectedContext))) as Record<string, JsonValue>
}

function providerJsonValue(discovery: EffectHarnessProviderDiscovery, graph: ResolvedGraph): Record<string, JsonValue> {
  return providerJsonValueForProjectedContext(discovery, effectHarnessProjectedContext(graph))
}

function packageManifestSurfaceIdForPath(targetPath: string) {
  return targetPath === 'package.json'
    ? 'package-manifest:root'
    : `package-manifest:${targetPath.replace(/\/package\.json$/u, '')}`
}

function packageManifestEntriesFromSurfaces(surfaces: readonly { readonly path: string, readonly pointer: string, readonly value: JsonValue }[]) {
  const manifests = new Map<string, Record<string, JsonValue>>()

  for (const surface of surfaces) {
    const [, section, rawKey] = surface.pointer.split('/')
    if (section === undefined || rawKey === undefined) {
      continue
    }

    const key = rawKey.replaceAll('~1', '/').replaceAll('~0', '~')
    const surfaceId = packageManifestSurfaceIdForPath(surface.path)
    const entries = manifests.get(surfaceId) ?? {}
    const sectionEntries = isJsonRecord(entries[section]) ? entries[section] : {}
    entries[section] = {
      ...sectionEntries,
      [key]: surface.value,
    }
    manifests.set(surfaceId, entries)
  }

  return [...manifests.entries()].map(([surfaceId, entries]) => ({ surfaceId, entries }))
}

export function effectHarnessContributions(discovery: EffectHarnessProviderDiscovery, graph: ResolvedGraph): readonly CapabilityContribution[] {
  const projectedContext = effectHarnessProjectedContext(graph)
  const packageEntries = packageManifestEntriesFromSurfaces(effectHarnessPackageSurfacesForProjectedContext(discovery, projectedContext))
  const editorSettings = effectHarnessEditorSettingsProjections(discovery)

  return [
    ...packageEntries.map(({ entries, surfaceId }) => ({
      kind: 'packageManifest',
      surfaceId: surfaceId as `package-manifest:${string}`,
      owner: 'provider:effect-harness',
      entries,
    } satisfies CapabilityContribution)),
    {
      kind: 'providerArtifact',
      surfaceId: 'provider:effect-harness',
      owner: 'provider:effect-harness',
      providerId: 'effect-harness',
      path: effectHarnessProviderPath,
      value: providerJsonValue(discovery, graph),
    },
    {
      kind: 'eslintRoot',
      surfaceId: 'eslint-root',
      owner: 'provider:effect-harness',
      providerConfigImports: [effectHarnessRootEslintProviderConfigImport()],
    },
    ...editorSettings.map(projection => ({
      kind: 'editorSettings' as const,
      surfaceId: editorSettingsSurfaceId(projection.path),
      owner: 'provider:effect-harness',
      path: projection.path,
      value: projection.value,
    })),
    ...effectHarnessDiscoveryManagedFileArtifacts(discovery, projectedContext).map(artifact => ({
      kind: 'providerManagedFile' as const,
      surfaceId: effectHarnessManagedFileSurfaceId(artifact.path),
      operationId: managedFileOperationId(artifact.path),
      owner: 'provider:effect-harness' as const,
      providerId: 'effect-harness' as const,
      path: artifact.path,
      content: artifact.content,
    })),
  ]
}
