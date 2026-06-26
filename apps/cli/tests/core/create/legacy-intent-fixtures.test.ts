import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import {
  enumerateRecoveredCreateSpecFixtureIds,
  findRecoveredCreateSpecFixture,
  legacyCliIntentInventory,
  legacyEffectIntentInventory,
  legacyGeneratedPackageContractInventory,
  legacyGeneratedSmokePolicy,
  legacyGuidedVariantInventory,
  legacyOutOfScopeIntents,
  legacyPresetMappings,
  legacySmokeCaseMappings,
  legacyWorkspaceGraphInvariants,
  recoveredCreateSpecFixtures,
  recoveredIntentInventory,
} from '@/core/create/recovered-intent-catalog'

function assertSameMembers(actual: readonly string[], expected: readonly string[]) {
  assert.deepEqual([...actual].sort(), [...expected].sort())
}

describe('legacy main intent fixture catalog', () => {
  it('states the recovery baselines and forbidden target concepts', () => {
    assert.equal(recoveredIntentInventory.baseline.intent, 'main')
    assert.equal(recoveredIntentInventory.baseline.implementation, 'docs/current')

    assertSameMembers(recoveredIntentInventory.coveredIntentAreas, [
      'react',
      'vue',
      'node-backend',
      'cli',
      'library',
      'workspace',
      'internal-workspace-dependencies',
      'engineering-baseline',
      'cli-behavior',
      'old-smoke-cases',
      'legacy-preset-shapes',
    ])

    const forbidden = recoveredIntentInventory.targetArchitectureRejections.join('\n')
    assert.match(forbidden, /ProjectConfig/u)
    assert.match(forbidden, /Plan or PlanSpec/u)
    assert.match(forbidden, /Handlebars or \.hbs/u)
    assert.match(forbidden, /\.trellis/u)
    assert.match(forbidden, /preset registry/u)
    assert.match(forbidden, /capability-owned direct writes/u)
    assert.match(forbidden, /whole-project lifecycle update/u)
  })

  it('loads and enumerates canonical recovered CreateSpec fixtures', () => {
    const fixtureIds = enumerateRecoveredCreateSpecFixtureIds()

    assert.ok(fixtureIds.length >= 17)
    assert.equal(new Set(fixtureIds).size, fixtureIds.length)

    for (const fixtureId of fixtureIds) {
      const fixture = findRecoveredCreateSpecFixture(fixtureId)
      assert.equal(fixture.id, fixtureId)
      assert.equal(fixture.source.baseline, 'main')
      assert.ok(fixture.expectations.length > 0)
      assert.ok(fixture.recoveryNotes.length > 0)

      if (fixture.createSpec.topology === 'single-package') {
        assert.ok(fixture.createSpec.package.capabilities.length > 0)
      }
      else {
        assert.ok(Array.isArray(fixture.createSpec.packages))
      }
    }
  })

  it('maps every legacy preset and compatibility alias from main', () => {
    assertSameMembers(legacyPresetMappings.map(mapping => mapping.legacyPreset), [
      'standalone-react-minimal',
      'standalone-react-full',
      'standalone-vue-minimal',
      'standalone-vue-full',
      'workspace-root-minimal',
      'workspace-cli-library',
      'workspace-fullstack-react',
      'workspace-fullstack-vue',
      'standalone-library-minimal',
      'standalone-library-node',
      'standalone-backend-minimal',
      'standalone-backend-full',
      'standalone-cli-minimal',
      'standalone-cli-effect',
      'standalone-cli-full',
      'react-minimal',
      'react-full',
      'vue-minimal',
      'vue-full',
      'workspace-root',
      'node-minimal',
      'cli-minimal',
      'cli-effect',
    ])

    const fixtureIds = new Set(enumerateRecoveredCreateSpecFixtureIds())
    for (const mapping of legacyPresetMappings) {
      if (mapping.status === 'mapped') {
        assert.ok(fixtureIds.has(mapping.fixtureId), `${mapping.legacyPreset} maps to an existing fixture`)
      }
    }
  })

  it('maps generated smoke cases and marks PlanSpec dry-run smoke out of scope', () => {
    const fixtureIds = new Set(enumerateRecoveredCreateSpecFixtureIds())
    const generatedSmokeMappings = legacySmokeCaseMappings.filter(mapping =>
      mapping.legacySmokeCase.startsWith('generated-projects:'),
    )
    const dryRunMappings = legacySmokeCaseMappings.filter(mapping =>
      mapping.legacySmokeCase.startsWith('dry-run-cli:'),
    )

    assert.ok(generatedSmokeMappings.length >= 14)
    assert.ok(dryRunMappings.length >= 14)

    for (const mapping of generatedSmokeMappings) {
      assert.equal(mapping.status, 'mapped')
      if (mapping.status === 'mapped') {
        assert.ok(fixtureIds.has(mapping.fixtureId), `${mapping.legacySmokeCase} maps to an existing fixture`)
        assert.ok(
          findRecoveredCreateSpecFixture(mapping.fixtureId).source.legacySmokeCases?.includes(mapping.legacySmokeCase),
          `${mapping.fixtureId} records ${mapping.legacySmokeCase}`,
        )
      }
    }

    const generatedSmokeFixtureIds = new Set<string>(
      generatedSmokeMappings.flatMap(mapping => mapping.status === 'mapped' ? [mapping.fixtureId] : []),
    )
    const generatedSmokeIntentAreas = new Set(
      recoveredCreateSpecFixtures
        .filter(fixture => generatedSmokeFixtureIds.has(fixture.id))
        .flatMap(fixture => fixture.intentAreas),
    )

    for (const intentArea of [
      'react',
      'vue',
      'node-backend',
      'cli',
      'library',
      'workspace',
      'internal-workspace-dependencies',
      'engineering-baseline',
      'old-smoke-cases',
    ] as const) {
      assert.ok(generatedSmokeIntentAreas.has(intentArea), `legacy generated smoke mapping is missing ${intentArea}`)
    }

    for (const mapping of dryRunMappings) {
      assert.equal(mapping.status, 'out-of-scope')
      if (mapping.status === 'out-of-scope') {
        assert.match(mapping.reason, /PlanSpec/u)
        assert.match(mapping.reason, /not wire it into create|forbidden target architecture/u)
      }
    }
  })

  it('covers guided variants, CLI intent, workspace graph invariants, and package contracts', () => {
    const guidedIds = new Set(legacyGuidedVariantInventory.map(entry => entry.id))
    assert.ok(guidedIds.has('react-guided-variant-space'))
    assert.ok(guidedIds.has('vue-guided-variant-space'))
    assert.ok(guidedIds.has('workspace-guided-variant-space'))

    const reactChoices = legacyGuidedVariantInventory.find(entry => entry.id === 'react-guided-variant-space')?.choices
    assert.deepEqual(reactChoices?.buildTool, ['vite', 'none'])
    assert.deepEqual(reactChoices?.cssPreprocessor, ['css', 'less', 'sass'])
    assert.deepEqual(reactChoices?.router, ['react-router', 'tanstack-router', 'none'])
    assert.deepEqual(reactChoices?.stateManagement, ['zustand', 'jotai', 'none'])

    const cliIntentIds = new Set(legacyCliIntentInventory.map(entry => entry.id))
    assertSameMembers([...cliIntentIds], [
      'guided-create',
      'direct-spec',
      'no-input',
      'print-spec',
      'preset-aliases',
      'dry-run',
      'yes-flag-rejection',
    ])
    assert.equal(legacyCliIntentInventory.find(entry => entry.id === 'dry-run')?.status, 'record-only')
    assert.equal(legacyCliIntentInventory.find(entry => entry.id === 'yes-flag-rejection')?.status, 'recover-rejection')

    assert.deepEqual(legacyEffectIntentInventory.recovered, ['generated Effect CLI toolkit intent'])
    assert.ok(legacyEffectIntentInventory.notRecovered.includes('effect-harness provider intent'))

    const workspaceInvariants = legacyWorkspaceGraphInvariants.invariants.join('\n')
    assert.match(workspaceInvariants, /id, name, kind, runtime, and path/u)
    assert.match(workspaceInvariants, /apps\/<id>/u)
    assert.match(workspaceInvariants, /libs\/<id>/u)
    assert.match(workspaceInvariants, /by id or by package name/u)
    assert.match(workspaceInvariants, /workspace:\*/u)
    assert.match(workspaceInvariants, /root and package scopes/u)

    const packageContracts = legacyGeneratedPackageContractInventory.map(entry => entry.id)
    assertSameMembers(packageContracts, [
      'node-and-library-dist-package-contract',
      'cli-bin-contract',
      'effect-cli-runtime-dependencies',
      'workspace-child-package-contract',
    ])
    assert.match(legacyGeneratedSmokePolicy.minimalPolicy, /build-only/u)
    assert.match(legacyGeneratedSmokePolicy.fullPolicy, /zero warnings/u)
  })

  it('keeps worker-app and old adapters explicitly out of scope', () => {
    assertSameMembers(legacyOutOfScopeIntents.map(intent => intent.id), [
      'legacy-worker-app-schema-placeholder',
      'legacy-project-config-adapter',
      'legacy-plan-spec-preview',
    ])

    assert.ok(
      legacyOutOfScopeIntents.some(intent =>
        intent.id === 'legacy-worker-app-schema-placeholder' && intent.reason.includes('generation rejected'),
      ),
    )
  })

  it('records fixture source paths for supplemental explorer evidence', () => {
    assert.ok(recoveredIntentInventory.mainSourcePaths.includes('apps/cli/src/schema/project-config.ts'))
    assert.ok(recoveredIntentInventory.mainSourcePaths.includes('apps/cli/templates/fragments/cli/effect-index.ts.hbs'))
    assert.ok(recoveredIntentInventory.mainSourcePaths.includes('.trellis/spec/create-yume/workspace-packages/index.md'))
    assert.ok(recoveredIntentInventory.mainSourcePaths.includes('.agents/skills/generated-scaffold-audit/references/create-yume-generated-quality.md'))
    assert.ok(recoveredCreateSpecFixtures.some(fixture => fixture.id === 'legacy-workspace-fullstack-react'))
  })
})
