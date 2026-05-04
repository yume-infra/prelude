import type { Preset } from '@/schema/preset'
import { select } from '@clack/prompts'

export async function askPreset() {
  return await select<Preset>({
    message: 'Choose a preset combination:',
    options: [
      { value: 'standalone-react-minimal', label: 'Standalone React Minimal - Vite, TypeScript, Less' },
      { value: 'standalone-react-full', label: 'Standalone React Full - Vite, TypeScript, Less, Tailwind, React Router, Jotai, Git, ESLint' },
      { value: 'standalone-vue-minimal', label: 'Standalone Vue Minimal - Vite, TypeScript, Less' },
      { value: 'standalone-vue-full', label: 'Standalone Vue Full - Vite, TypeScript, Less, Tailwind, Vue Router, Pinia, Git, ESLint' },
      { value: 'workspace-root-minimal', label: 'Workspace Root Minimal - pnpm workspace root' },
      { value: 'standalone-backend-minimal', label: 'Standalone Backend Minimal - TypeScript, ESM, tsdown' },
      { value: 'standalone-cli-minimal', label: 'Standalone CLI Minimal - TypeScript, ESM, tsdown, bin' },
    ],
  })
}
