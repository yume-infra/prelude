export const eslintProviderHookStartMarker = '// <prelude:provider-eslint-config:start>'
export const eslintProviderHookEndMarker = '// <prelude:provider-eslint-config:end>'

export function eslintProviderHookBlock(providerConfigImports: readonly string[]) {
  const uniqueImports = [...new Set(providerConfigImports)]
  const providerImports = uniqueImports.map((importPath, index) => ({
    importName: `effectHarnessProviderConfig${index + 1}`,
    importPath,
  }))

  if (providerImports.length === 0) {
    return ''
  }

  const importLines = providerImports
    .map(providerImport => `import ${providerImport.importName} from '${providerImport.importPath}'`)
    .join('\n')
  const spreadLines = providerImports
    .map(providerImport => `  ...${providerImport.importName},\n`)
    .join('')

  return `${eslintProviderHookStartMarker}
${importLines}

const preludeProviderConfigs = [
${spreadLines}]
${eslintProviderHookEndMarker}
`
}
