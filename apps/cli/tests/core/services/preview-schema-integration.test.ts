import type { StandardCommand } from '@effect/platform/Command'
import type { Plan } from '../../../src/core/services/planner'
import { Command } from '@effect/platform'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTemplatePath } from '../../../src/brand/template-path'
import { PlanSpecProjectionError } from '../../../src/core/errors'
import {
  contributionTrace,
  ContributionUnitKind,
  ReactScaffoldOwner,
  WorkspaceBootstrapOwner,
} from '../../../src/core/ownership/model'
import { buildPlan } from '../../../src/core/services/plan/build'
import { projectPlanSpec } from '../../../src/core/services/planner'
import { formatDryRunPreview } from '../../../src/core/services/preview'
import { decodePlanSpec } from '../../../src/schema/plan-spec'

const reactRenderOwnership = contributionTrace(ReactScaffoldOwner, ContributionUnitKind.FragmentRender)
const packageOwnership = contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.JsonTextMutation)
const commandOwnership = contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateCommand)
const fileActionOwnership = contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateFile)

async function projectDecodeAndFormat(plan: Plan, onFormat?: () => void) {
  const projected = await Effect.runPromise(projectPlanSpec(plan))
  const decoded = await Effect.runPromise(decodePlanSpec(projected))
  onFormat?.()

  return {
    decoded,
    preview: formatDryRunPreview(decoded),
    projected,
  }
}

describe('planSpec schema-to-preview integration', () => {
  it('formats dry-run preview only after Plan projection and schema decode succeed', async () => {
    const plan: Plan = {
      ...buildPlan((dsl) => {
        dsl.render(
          makeTemplatePath('/templates/react/App.tsx.hbs'),
          'src/App.tsx',
          { framework: 'react', features: ['router', 'state'], strict: true },
          reactRenderOwnership,
        )
        dsl.json('package.json', packageOwnership)
          .readExisting(true)
          .sortKeys(true)
          .base(() => ({ name: 'demo-app', scripts: { dev: 'vite' } }))
          .merge(
            { dependencies: { '@vitejs/plugin-react': '^latest', 'react': '^19.0.0' } },
            packageOwnership,
          )
      }),
      postGenerateCommands: [
        {
          command: Command.make('pnpm', 'install') as StandardCommand,
          phase: 'after-plan-apply',
          ownership: commandOwnership,
        },
      ],
      postGenerateFileActions: [
        {
          kind: 'write-file',
          path: '.husky/pre-commit',
          content: 'pnpm lint-staged\n',
          phase: 'after-post-generate-commands',
          ownership: fileActionOwnership,
          executable: true,
        },
      ],
    }

    const { decoded, preview, projected } = await projectDecodeAndFormat(plan)

    expect(decoded).toEqual(projected)
    expect(projected).toEqual({
      tasks: [
        {
          kind: 'render',
          path: 'src/App.tsx',
          src: makeTemplatePath('/templates/react/App.tsx.hbs'),
          data: { framework: 'react', features: ['router', 'state'], strict: true },
          ownership: reactRenderOwnership,
        },
        {
          kind: 'json',
          path: 'package.json',
          ownership: packageOwnership,
          readExisting: true,
          sortKeys: true,
          base: { name: 'demo-app', scripts: { dev: 'vite' } },
          reducers: [
            {
              reducer: 'merge',
              ownership: packageOwnership,
              input: { dependencies: { '@vitejs/plugin-react': '^latest', 'react': '^19.0.0' } },
            },
          ],
        },
      ],
      postGenerateCommands: [
        {
          command: 'pnpm',
          args: ['install'],
          phase: 'after-plan-apply',
          ownership: commandOwnership,
        },
      ],
      postGenerateFileActions: [
        {
          kind: 'write-file',
          path: '.husky/pre-commit',
          content: 'pnpm lint-staged\n',
          phase: 'after-post-generate-commands',
          ownership: fileActionOwnership,
          executable: true,
        },
      ],
    })
    expect(preview).toContain('Dry run preview')
    expect(preview).toContain('No files or directories will be written, and no commands will be executed.')
    expect(preview).toContain('Post-generate command internal file effects are not fully shown.')
    expect(preview).toContain('- render src/App.tsx (owner: react-scaffold, unit: fragment-render)')
    expect(preview).toContain('- json package.json (owner: workspace-bootstrap, unit: json-text-mutation)')
    expect(preview).toContain('  - reducer: merge (owner: workspace-bootstrap, unit: json-text-mutation)')
    expect(preview).toContain('- after-plan-apply: pnpm install (owner: workspace-bootstrap, unit: post-generate-command)')
    expect(preview).toContain('- after-post-generate-commands: write-file .husky/pre-commit (executable: true) (owner: workspace-bootstrap, unit: post-generate-file)')
    expect(preview).not.toContain('framework')
    expect(preview).not.toContain('@vitejs/plugin-react')
    expect(preview).not.toContain('pnpm lint-staged')
  })

  it('fails malformed projection data before preview formatting is trusted', async () => {
    const malformedPlan = buildPlan((dsl) => {
      dsl.render(
        makeTemplatePath('/templates/react/App.tsx.hbs'),
        'src/App.tsx',
        { handler: () => 'not-json' },
        reactRenderOwnership,
      )
      dsl.json('package.json', packageOwnership)
        .merge({ nested: { invalid: Symbol('secret') } }, packageOwnership)
    })
    let formatWasCalled = false

    await expect(projectDecodeAndFormat(malformedPlan, () => {
      formatWasCalled = true
    })).rejects.toThrow('PlanSpec projection failed')

    expect(formatWasCalled).toBe(false)
    const exit = await Effect.runPromiseExit(projectPlanSpec(malformedPlan))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure' && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PlanSpecProjectionError)
      expect(exit.cause.error.issues).toEqual([
        expect.objectContaining({
          taskKind: 'render',
          targetPath: 'src/App.tsx',
          fieldPath: 'tasks[0].data.handler',
          reason: 'Unsupported function value cannot be projected to JsonLiteral',
        }),
        expect.objectContaining({
          taskKind: 'json',
          targetPath: 'package.json',
          fieldPath: 'tasks[1].reducers[0].input.nested.invalid',
          reason: 'Unsupported symbol value cannot be projected to JsonLiteral',
        }),
      ])
    }
  })
})
