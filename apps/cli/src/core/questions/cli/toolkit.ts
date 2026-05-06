import type { CliToolkit } from '@/schema/project-config'
import { select } from '@clack/prompts'

export async function askCliToolkit() {
  return await select<CliToolkit>({
    message: 'Choose a CLI toolkit:',
    options: [
      { value: 'none', label: 'Minimal - no CLI framework' },
      { value: 'effect', label: 'Effect - @effect/cli command runtime' },
    ],
  })
}
