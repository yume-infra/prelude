import type { VueAppShellContribution, WriteOperation } from '../model'
import { classAttribute, unique } from './shared'

export function materializeVueAppShell(contributions: readonly VueAppShellContribution[]): WriteOperation[] {
  if (contributions.length === 0) {
    return []
  }

  const surfaceId = contributions[0]!.surfaceId
  const shellPath = contributions[0]!.path
  const imports = unique(contributions.flatMap(contribution => contribution.scriptImports))
  const scriptSetup = contributions.flatMap(contribution => contribution.scriptSetup)
  const templateContent = contributions.flatMap(contribution => contribution.templateContent)
  const mainClassNameTokens = unique(contributions.flatMap(contribution => contribution.mainClassNameTokens))
  const hasTailwindClasses = mainClassNameTokens.length > 0
  const scriptLines = [...imports, ...scriptSetup]
  const scopedStyle = hasTailwindClasses
    ? ''
    : `

<style scoped>
main {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 1rem;
  margin: 0;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
  color: #1f2937;
  background: #f8fafc;
}

h1,
p {
  margin: 0;
}
</style>
`

  return [{
    id: 'write-vue-app-shell',
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:vue-app-shell',
    surfaceId,
    path: shellPath,
    authority: 'none',
    content: `<script setup lang="ts">
${scriptLines.join('\n')}
</script>

<template>
  <main${classAttribute('class', mainClassNameTokens)}>
${templateContent.join('\n')}
  </main>
</template>${scopedStyle}
`,
  }]
}
