import { Schema } from 'effect'

export const GenerationTargetScopeSchema = Schema.Literal('root', 'package', 'both').annotations({
  identifier: 'GenerationTargetScope',
  title: 'GenerationTargetScope',
})

export type GenerationTargetScope = Schema.Schema.Type<typeof GenerationTargetScopeSchema>

export function resolveGenerationTargetScope(scope: GenerationTargetScope | undefined): GenerationTargetScope {
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
