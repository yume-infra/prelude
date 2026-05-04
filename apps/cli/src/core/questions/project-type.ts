import type { ProjectType } from '@/schema/project-config'
import { select } from '@clack/prompts'

export async function askProjectType() {
  return await select<ProjectType>({
    message: 'Choose project type:',
    options: [
      { value: 'vue', label: 'Vue Application' },
      { value: 'react', label: 'React Application' },
      { value: 'workspace-root', label: 'pnpm Workspace Root' },
    ],
  })
}
