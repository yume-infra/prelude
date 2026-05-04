import type { Preset } from '@/schema/preset'
import { select } from '@clack/prompts'

export async function askPreset() {
  return await select<Preset>({
    message: 'Choose a preset combination:',
    options: [
      { value: 'react-minimal', label: 'React Minimal - Vite, TypeScript, Less' },
      { value: 'react-full', label: 'React Full - Vite, TypeScript, Less, Tailwind, React Router, Jotai, Git, ESLint' },
      { value: 'vue-minimal', label: 'Vue Minimal - Vite, TypeScript, Less' },
      { value: 'vue-full', label: 'Vue Full - Vite, TypeScript, Less, Tailwind, Vue Router, Pinia, Git, ESLint' },
      { value: 'node-minimal', label: 'Node Minimal - TypeScript, ESM, tsdown' },
      { value: 'cli-minimal', label: 'CLI Minimal - TypeScript, ESM, tsdown, bin' },
    ],
  })
}
