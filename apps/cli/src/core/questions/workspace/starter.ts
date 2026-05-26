import { select } from '@clack/prompts'

export type WorkspaceStarter = 'empty' | 'cli-library' | 'fullstack-react' | 'fullstack-vue'

export async function askWorkspaceStarter() {
  return await select<WorkspaceStarter>({
    message: 'Choose workspace layout:',
    options: [
      { value: 'empty', label: 'Empty Workspace - pnpm workspace root only' },
      { value: 'cli-library', label: 'CLI Tool + Core Library - apps/cli and libs/core' },
      { value: 'fullstack-react', label: 'Fullstack React - apps/web, apps/api, libs/shared' },
      { value: 'fullstack-vue', label: 'Fullstack Vue - apps/web, apps/api, libs/shared' },
    ],
  })
}
