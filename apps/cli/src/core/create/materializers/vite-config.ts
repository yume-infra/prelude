import type { ViteConfigContribution, WriteOperation } from '../model'
import { sortImportLines, unique } from './shared'

export function materializeViteConfig(surfaceId: string, contributions: readonly ViteConfigContribution[]): WriteOperation {
  const firstContribution = contributions[0]!
  const imports = sortImportLines(contributions.flatMap(contribution => contribution.imports))
  const plugins = unique(contributions.flatMap(contribution => contribution.plugins))
  const pluginList = plugins.length === 1
    ? plugins[0]!
    : `\n${plugins.map(plugin => `    ${plugin}`).join(',\n')},\n  `

  return {
    id: 'write-vite-config',
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:vite-config',
    surfaceId,
    path: firstContribution.path,
    authority: 'none',
    content: `${[
      ...imports,
      'import { defineConfig } from \'vite\'',
    ].join('\n')}

export default defineConfig({
  plugins: [${pluginList}],
})
`,
  }
}
