import type { TemplatePath } from '../brand/template-path'
import type { GenerationTargetScope } from './target-scope'
import type { ContributionTrace } from '@/core/ownership/model'
import { ParseResult, Schema } from 'effect'
import { TemplatePathSchema } from '../brand/template-path'
import { ContributionTraceSchema } from './plan-spec'
import { GenerationTargetScopeSchema } from './target-scope'

export const TemplateRegistryEntryDeclarationSchema = Schema.Struct({
  target: Schema.String,
  template: TemplatePathSchema,
  scope: Schema.optionalWith(GenerationTargetScopeSchema, { exact: true }),
  ownership: Schema.optionalWith(ContributionTraceSchema, { exact: true }),
}).annotations({
  identifier: 'TemplateRegistryEntryDeclaration',
  title: 'TemplateRegistryEntryDeclaration',
})

export type TemplateRegistryEntryDeclaration = Schema.Schema.Type<typeof TemplateRegistryEntryDeclarationSchema>

export type TemplateRegistryCondition<T> = (config: T) => boolean
export type TemplateRegistryTarget<T> = TemplateRegistryEntryDeclaration['target'] | ((config: T) => TemplateRegistryEntryDeclaration['target'])

export interface TemplateRegistryEntry<T> {
  readonly template: TemplatePath
  readonly target: TemplateRegistryTarget<T>
  readonly scope?: GenerationTargetScope
  readonly condition: TemplateRegistryCondition<T>
  readonly ownership?: ContributionTrace
}

export type TemplateRegistry<T> = Record<string, TemplateRegistryEntry<T>>

export const decodeTemplateRegistryEntryDeclaration = Schema.decodeUnknown(TemplateRegistryEntryDeclarationSchema, { errors: 'all' })

export const formatTemplateRegistryEntryDeclarationError = ParseResult.TreeFormatter.formatErrorSync
