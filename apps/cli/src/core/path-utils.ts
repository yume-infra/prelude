export function pathIsAbsolute(filePath: string) {
  return filePath.startsWith('/')
}

export function pathNormalize(filePath: string) {
  const isAbsolute = pathIsAbsolute(filePath)
  const parts: string[] = []

  for (const segment of filePath.split('/')) {
    if (segment.length === 0 || segment === '.') {
      continue
    }

    if (segment === '..') {
      const previous = parts.at(-1)
      if (previous !== undefined && previous !== '..') {
        parts.pop()
        continue
      }

      if (!isAbsolute) {
        parts.push(segment)
      }
      continue
    }

    parts.push(segment)
  }

  const normalized = `${isAbsolute ? '/' : ''}${parts.join('/')}`
  return normalized.length > 0 ? normalized : isAbsolute ? '/' : '.'
}

export function pathJoin(...segments: readonly string[]) {
  return pathNormalize(segments.filter(segment => segment.length > 0).join('/'))
}

export function pathDirname(filePath: string) {
  const normalized = pathNormalize(filePath)
  if (normalized === '/' || normalized === '.') {
    return normalized
  }

  const index = normalized.lastIndexOf('/')
  if (index === -1) {
    return '.'
  }

  return index === 0 ? '/' : normalized.slice(0, index)
}
