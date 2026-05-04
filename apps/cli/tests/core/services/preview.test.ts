import type { PlanSpec } from '@/schema/plan-spec'
import { describe, expect, it } from 'vitest'
import { makeTemplatePath } from '../../../src/brand/template-path'
import { formatDryRunPreview } from '../../../src/core/services/preview'

const planSpec: PlanSpec = {
  tasks: [
    {
      kind: 'render',
      path: 'src/App.tsx',
      src: makeTemplatePath('/virtual/templates/App.tsx.hbs'),
      ownership: {
        owner: 'react-scaffold',
        unit: 'fragment-render',
      },
    },
    {
      kind: 'json',
      path: 'package.json',
      ownership: {
        owner: 'workspace-bootstrap',
        unit: 'json-text-mutation',
      },
      reducers: [
        {
          reducer: 'applyPackageManifestContribution',
          ownership: {
            owner: 'router',
            unit: 'json-text-mutation',
          },
        },
        {
          reducer: 'applyPackageManifestContribution',
          ownership: {
            owner: 'state-management',
            unit: 'json-text-mutation',
          },
        },
      ],
    },
  ],
  postGenerateCommands: [
    {
      command: 'pnpm',
      args: ['install'],
      phase: 'after-plan-apply',
      ownership: {
        owner: 'workspace-bootstrap',
        unit: 'post-generate-command',
      },
    },
  ],
  postGenerateFileActions: [
    {
      kind: 'write-file',
      path: '.husky/pre-commit',
      content: 'pnpm lint-staged\n',
      phase: 'after-post-generate-commands',
      ownership: {
        owner: 'workspace-bootstrap',
        unit: 'post-generate-file',
      },
      executable: true,
    },
  ],
}

describe('formatDryRunPreview', () => {
  it('renders planned file tasks and owner traces from PlanSpec data', () => {
    expect(formatDryRunPreview(planSpec)).toMatchInlineSnapshot(`
      "Dry run preview
      No files or directories will be written, and no commands will be executed.
      Post-generate command internal file effects are not fully shown.

      Planned files:
      - render src/App.tsx (owner: react-scaffold, unit: fragment-render)
      - json package.json (owner: workspace-bootstrap, unit: json-text-mutation)
        - reducer: applyPackageManifestContribution (owner: router, unit: json-text-mutation)
        - reducer: applyPackageManifestContribution (owner: state-management, unit: json-text-mutation)

      Post-generate commands:
      - after-plan-apply: pnpm install (owner: workspace-bootstrap, unit: post-generate-command)

      Post-generate file actions:
      - after-post-generate-commands: write-file .husky/pre-commit (executable: true) (owner: workspace-bootstrap, unit: post-generate-file)
      "
    `)
  })

  it('renders empty sections explicitly', () => {
    expect(formatDryRunPreview({ tasks: [] })).toContain('Planned files:\n- (none)')
    expect(formatDryRunPreview({ tasks: [] })).toContain('Post-generate commands:\n- (none)')
    expect(formatDryRunPreview({ tasks: [] })).toContain('Post-generate file actions:\n- (none)')
  })

  it('renders non-executable post-generate file actions explicitly', () => {
    expect(formatDryRunPreview({
      tasks: [],
      postGenerateFileActions: [
        {
          kind: 'write-file',
          path: '.husky/commit-msg',
          content: 'pnpm exec commitlint --edit "$1"\n',
          phase: 'after-post-generate-commands',
        },
      ],
    })).toContain('- after-post-generate-commands: write-file .husky/commit-msg (executable: false)')
  })

  it('separates root files from workspace package files when nested package paths exist', () => {
    const preview = formatDryRunPreview({
      tasks: [
        {
          kind: 'render',
          path: 'pnpm-workspace.yaml',
          src: makeTemplatePath('/virtual/templates/pnpm-workspace.yaml.hbs'),
        },
        {
          kind: 'render',
          path: 'apps/web/src/main.tsx',
          src: makeTemplatePath('/virtual/templates/main.tsx.hbs'),
        },
        {
          kind: 'json',
          path: 'libs/shared/package.json',
          reducers: [],
        },
      ],
    })

    expect(preview).toContain('Root files:\n- render pnpm-workspace.yaml')
    expect(preview).toContain('Workspace package files:\n- render apps/web/src/main.tsx')
    expect(preview).toContain('- json libs/shared/package.json')
  })
})
