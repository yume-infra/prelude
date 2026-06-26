export function unique(values: readonly string[]) {
  return [...new Set(values)]
}

function importSource(importLine: string) {
  const match = /(?:from|import) '([^']+)'/u.exec(importLine)
  return match?.[1] ?? importLine
}

export function sortImportLines(imports: readonly string[]) {
  return unique(imports).sort((left, right) =>
    importSource(left).localeCompare(importSource(right)) || left.localeCompare(right),
  )
}

function surfaceSuffix(surfaceId: string, prefix: string) {
  return surfaceId.startsWith(prefix) ? surfaceId.slice(prefix.length) : 'root'
}

export function scopedPathFromSurface(surfaceId: string, prefix: string, filePath: string) {
  const scope = surfaceSuffix(surfaceId, prefix)
  return scope === 'root' ? filePath : `${scope}/${filePath}`
}

export function scopedOperationId(baseId: string, targetPath: string) {
  return targetPath.includes('/') && !targetPath.startsWith('src/') && !targetPath.startsWith('scripts/')
    ? `${baseId}:${targetPath.split('/').slice(0, -1).join('/')}`
    : baseId
}

export function classAttribute(kind: 'class' | 'className', tokens: readonly string[]) {
  return tokens.length > 0 ? ` ${kind}="${tokens.join(' ')}"` : ''
}

export function indentJsx(lines: readonly string[], spaces: number) {
  const prefix = ' '.repeat(spaces)
  return lines.map((line) => {
    const content = line.startsWith('      ') ? line.slice(6) : line.trimStart()
    return `${prefix}${content}`
  })
}
