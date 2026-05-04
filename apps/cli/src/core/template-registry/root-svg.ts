import type { TemplatePath } from '@/brand/template-path'
import type { ComposeDSL } from '@/core/services/planner'
import * as path from 'node:path'
import { makeTemplatePath } from '@/brand/template-path'
import { contributionTrace, ContributionUnitKind, FrontendScaffoldOwner } from '@/core/ownership/model'

function targetPathWithinDirectory(targetDirectory: string | undefined, targetPath: string): string {
  const normalizedDirectory = targetDirectory?.replace(/^\/+|\/+$/g, '') ?? ''
  if (!normalizedDirectory) {
    return targetPath
  }

  return `${normalizedDirectory}/${targetPath.replace(/^\/+/, '')}`
}

export function buildRootSvg(
  dsl: ComposeDSL,
  templateRoot: TemplatePath,
  options: { readonly targetDirectory?: string } = {},
) {
  const src = makeTemplatePath(path.join(templateRoot, 'assets', 'moon-star.svg'))
  dsl.copy(
    src,
    targetPathWithinDirectory(options.targetDirectory, 'public/moon-star.svg'),
    contributionTrace(FrontendScaffoldOwner, ContributionUnitKind.StaticAssetCopy),
  )
}
