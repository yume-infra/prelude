import type { TemplatePath } from '../brand/template-path'
import type { GenerationTargetScope } from './target-scope'
import type { ContributionTrace } from '@/core/ownership/model'

type TemplateRegistryCondition<T> = (config: T) => boolean
type TemplateRegistryTarget<T> = string | ((config: T) => string)

export interface TemplateRegistryEntry<T> {
  readonly template: TemplatePath
  readonly target: TemplateRegistryTarget<T>
  readonly scope?: GenerationTargetScope
  readonly condition: TemplateRegistryCondition<T>
  readonly ownership?: ContributionTrace
}

export type TemplateRegistry<T> = Record<string, TemplateRegistryEntry<T>>
