import type { FrontendEntryContribution, WriteOperation } from '../model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'
import { sortImportLines, unique } from './shared'

export function materializeFrontendEntry(surfaceId: string, contributions: readonly FrontendEntryContribution[]): Effect.Effect<WriteOperation, SchemaContractError> {
  const base = contributions.find(contribution => contribution.framework !== undefined)

  if (!base?.framework) {
    return Effect.fail(new SchemaContractError({
      schema: surfaceId,
      issueCount: 1,
      message: `Frontend entry surface ${surfaceId} is missing a framework owner contribution.`,
    }))
  }

  const imports = sortImportLines(contributions.flatMap(contribution => contribution.imports))
  const declarations = contributions.flatMap(contribution => contribution.declarations)
  const appUse = unique(contributions.flatMap(contribution => contribution.appUse))
  const styleImports = unique(contributions.flatMap(contribution => contribution.styleImports))
  const styleImportLines = styleImports.map(importPath => `import '${importPath}'`)

  if (base.framework === 'react') {
    return Effect.succeed({
      id: 'write-react-main',
      kind: 'writeGeneratedUserFile',
      owner: 'materializer:frontend-entry',
      surfaceId,
      path: base.path,
      authority: 'none',
      content: `${[
        'import { StrictMode } from \'react\'',
        'import { createRoot } from \'react-dom/client\'',
        'import { App } from \'./App\'',
        ...imports,
        ...styleImportLines,
      ].join('\n')}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
    })
  }

  const appFactory = ['createApp(App)', ...appUse.map(use => `use(${use})`)].join('.')

  return Effect.succeed({
    id: 'write-vue-main',
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:frontend-entry',
    surfaceId,
    path: base.path,
    authority: 'none',
    content: `${[
      'import { createApp } from \'vue\'',
      ...imports,
      'import App from \'./App.vue\'',
      ...styleImportLines,
    ].join('\n')}
${declarations.length > 0 ? `\n${declarations.join('\n')}\n` : ''}
${appFactory}.mount('#app')
`,
  })
}
