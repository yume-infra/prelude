export interface ManagedBlockMarkers {
  readonly startMarker: string
  readonly endMarker: string
}

export function extractManagedBlock(
  content: string,
  markers: ManagedBlockMarkers,
): string | undefined {
  const startIndex = content.indexOf(markers.startMarker)
  if (startIndex < 0) {
    return undefined
  }

  const endIndex = content.indexOf(markers.endMarker, startIndex + markers.startMarker.length)
  if (endIndex < 0) {
    return undefined
  }

  const endMarkerEnd = endIndex + markers.endMarker.length
  const trailingNewlineEnd = content[endMarkerEnd] === '\n' ? endMarkerEnd + 1 : endMarkerEnd

  return content.slice(startIndex, trailingNewlineEnd)
}

export function managedBlockCount(
  content: string,
  markers: ManagedBlockMarkers,
) {
  let count = 0
  let offset = 0

  while (offset < content.length) {
    const startIndex = content.indexOf(markers.startMarker, offset)
    if (startIndex < 0) {
      return count
    }

    const endIndex = content.indexOf(markers.endMarker, startIndex + markers.startMarker.length)
    if (endIndex < 0) {
      return count + 1
    }

    count += 1
    offset = endIndex + markers.endMarker.length
  }

  return count
}

export function upsertManagedBlock(
  content: string,
  markers: ManagedBlockMarkers,
  block: string,
) {
  const startIndex = content.indexOf(markers.startMarker)
  const endIndex = startIndex < 0
    ? -1
    : content.indexOf(markers.endMarker, startIndex + markers.startMarker.length)

  if (startIndex >= 0 && endIndex >= 0) {
    const endMarkerEnd = endIndex + markers.endMarker.length
    const trailingNewlineEnd = content[endMarkerEnd] === '\n' ? endMarkerEnd + 1 : endMarkerEnd

    return `${content.slice(0, startIndex)}${block}${content.slice(trailingNewlineEnd)}`
  }

  const prefix = content.trim().length > 0 ? `${content.trimEnd()}\n\n` : ''
  return `${prefix}${block}`
}
