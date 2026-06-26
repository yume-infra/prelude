import type { ReactAppShellContribution, WriteOperation } from '../model'
import { classAttribute, indentJsx, sortImportLines, unique } from './shared'

export function materializeReactAppShell(contributions: readonly ReactAppShellContribution[]): WriteOperation[] {
  if (contributions.length === 0) {
    return []
  }

  const surfaceId = contributions[0]!.surfaceId
  const shellPath = contributions[0]!.path
  const imports = sortImportLines(contributions.flatMap(contribution => contribution.imports))
  const moduleDeclarations = unique(contributions.flatMap(contribution => contribution.moduleDeclarations))
  const componentDeclarations = contributions.flatMap(contribution => contribution.componentDeclarations)
  const featureContent = contributions
    .filter(contribution => contribution.owner !== 'capability:react-app')
    .flatMap(contribution => contribution.content)
  const baseContent = contributions
    .filter(contribution => contribution.owner === 'capability:react-app')
    .flatMap(contribution => contribution.content)
  const content = featureContent.length > 0 ? featureContent : baseContent
  const mainClassNameTokens = unique(contributions.flatMap(contribution => contribution.mainClassNameTokens))
  const routing = unique(contributions.flatMap(contribution => contribution.routing))
  const importBlock = imports.length > 0 ? `${imports.join('\n')}\n\n` : ''
  const moduleDeclarationBlock = moduleDeclarations.length > 0 ? `${moduleDeclarations.join('\n')}\n\n` : ''
  const declarationBlock = componentDeclarations.length > 0 ? `\n${componentDeclarations.join('\n')}\n` : ''
  const mainOpen = `<main${classAttribute('className', mainClassNameTokens)}>`
  const mainBlock = [
    `    ${mainOpen}`,
    ...indentJsx(content, 6),
    '    </main>',
  ]
  const body = routing.includes('react-router')
    ? [
        '    <BrowserRouter>',
        '      <nav>',
        '        <Link to="/">Home</Link>',
        '      </nav>',
        '      <Routes>',
        '        <Route',
        '          path="/"',
        '          element={(',
        `            ${mainOpen}`,
        ...indentJsx(content, 14),
        '            </main>',
        '          )}',
        '        />',
        '      </Routes>',
        '    </BrowserRouter>',
      ].join('\n')
    : mainBlock.join('\n')

  return [{
    id: 'write-react-app-shell',
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:react-app-shell',
    surfaceId,
    path: shellPath,
    authority: 'none',
    content: `${importBlock}${moduleDeclarationBlock}export function App() {${declarationBlock}
  return (
${body}
  )
}
`,
  }]
}
