const packageJsonTopLevelOrder = [
  'publisher',
  'name',
  'displayName',
  'type',
  'version',
  'private',
  'packageManager',
  'description',
  'author',
  'contributors',
  'license',
  'funding',
  'homepage',
  'repository',
  'bugs',
  'keywords',
  'categories',
  'sideEffects',
  'imports',
  'exports',
  'main',
  'module',
  'unpkg',
  'jsdelivr',
  'types',
  'typesVersions',
  'bin',
  'icon',
  'files',
  'engines',
  'activationEvents',
  'contributes',
  'scripts',
  'peerDependencies',
  'peerDependenciesMeta',
  'dependencies',
  'optionalDependencies',
  'devDependencies',
  'pnpm',
  'overrides',
  'resolutions',
  'husky',
  'simple-git-hooks',
  'lint-staged',
  'eslintConfig',
] as const

const alphabetizedPackageMapKeys = new Set([
  'scripts',
  'peerDependencies',
  'peerDependenciesMeta',
  'dependencies',
  'optionalDependencies',
  'devDependencies',
  'pnpm',
  'overrides',
  'resolutions',
  'husky',
  'simple-git-hooks',
  'lint-staged',
])

export const packageJsonTopLevelKeyOrder = [...packageJsonTopLevelOrder]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function compareKeys(a: string, b: string) {
  return a.localeCompare(b)
}

function orderKnownKeys(
  input: Record<string, unknown>,
  order: readonly string[],
  transformValue: (key: string, value: unknown) => unknown,
) {
  const knownKeys = new Set(order)
  const ordered: Record<string, unknown> = {}

  for (const key of order) {
    if (Object.hasOwn(input, key)) {
      ordered[key] = transformValue(key, input[key])
    }
  }

  for (const key of Object.keys(input).filter(key => !knownKeys.has(key)).sort(compareKeys)) {
    ordered[key] = transformValue(key, input[key])
  }

  return ordered
}

function sortObjectKeys(input: Record<string, unknown>): Record<string, unknown> {
  const ordered: Record<string, unknown> = {}

  for (const key of Object.keys(input).sort(compareKeys)) {
    const value = input[key]
    ordered[key] = isPlainObject(value) ? sortObjectKeys(value) : value
  }

  return ordered
}

function replaceObjectContents(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const key of Object.keys(target)) {
    delete target[key]
  }

  for (const [key, value] of Object.entries(source)) {
    target[key] = value
  }
}

export function finalizePackageJsonOrder(draft: Record<string, unknown>) {
  const ordered = orderKnownKeys(
    draft,
    packageJsonTopLevelOrder,
    (key, value) => isPlainObject(value) && alphabetizedPackageMapKeys.has(key)
      ? sortObjectKeys(value)
      : value,
  )

  replaceObjectContents(draft, ordered)
}
