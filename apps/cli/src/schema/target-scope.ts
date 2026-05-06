export type GenerationTargetScope = 'root' | 'package' | 'both'

function resolveGenerationTargetScope(scope: GenerationTargetScope | undefined): GenerationTargetScope {
  return scope ?? 'both'
}

export function matchesGenerationTargetScope(
  entryScope: GenerationTargetScope | undefined,
  targetScope: GenerationTargetScope,
): boolean {
  const resolvedEntryScope = resolveGenerationTargetScope(entryScope)

  return targetScope === 'both'
    || resolvedEntryScope === 'both'
    || resolvedEntryScope === targetScope
}
