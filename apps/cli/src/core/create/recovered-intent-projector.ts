import type { CapabilityId, CreateSpec } from './model'
import { makePackageName } from '@/brand/package-name'
import { findRecoveredCreateSpecFixture } from './recovered-intent-catalog'

export type ProjectableRecoveredIntentFixtureId = 'legacy-react-minimal' | 'legacy-react-full' | 'legacy-vue-minimal' | 'legacy-vue-full' | 'legacy-cli-effect'

function projectRootCapability(capability: string): string | undefined {
  switch (capability) {
    case 'package-manager:pnpm':
    case 'knip':
    case 'dependency-update:taze':
      return capability
    case 'linting':
    case 'linting:antfu-eslint':
      return 'linting'
    default:
      return undefined
  }
}

export function projectRecoveredIntentFixtureToCreateSpec(id: ProjectableRecoveredIntentFixtureId): CreateSpec {
  const fixture = findRecoveredCreateSpecFixture(id)

  if (fixture.createSpec.topology !== 'single-package') {
    throw new Error(`${id} is not projectable through the #13 single-package tracer`)
  }

  if (id === 'legacy-cli-effect') {
    return {
      topology: 'single-package',
      package: {
        id: fixture.createSpec.package.id,
        name: makePackageName(fixture.createSpec.package.name),
        capabilities: ['effect-package'],
      },
      rootCapabilities: [
        ...new Set([
          ...fixture.createSpec.rootCapabilities.flatMap((capability) => {
            const projected = projectRootCapability(capability)
            return projected === undefined ? [] : [projected]
          }),
          'ai-harness',
        ]),
      ],
      providers: ['effect-harness'],
      overrides: {},
    }
  }

  const packageCapabilitiesByFixture = {
    'legacy-react-minimal': ['react-app', 'css:less'],
    'legacy-react-full': ['react-app', 'css:less', 'css:tailwind', 'router:react-router', 'state:jotai'],
    'legacy-vue-minimal': ['vue-app', 'css:less'],
    'legacy-vue-full': ['vue-app', 'css:less', 'css:tailwind', 'router:vue-router', 'state:pinia'],
  } as const satisfies Record<Exclude<ProjectableRecoveredIntentFixtureId, 'legacy-cli-effect'>, readonly CapabilityId[]>
  const packageCapabilities = packageCapabilitiesByFixture[id]

  return {
    topology: 'single-package',
    package: {
      id: fixture.createSpec.package.id,
      name: makePackageName(fixture.createSpec.package.name),
      capabilities: packageCapabilities,
    },
    rootCapabilities: [...new Set(fixture.createSpec.rootCapabilities.flatMap((capability) => {
      const projected = projectRootCapability(capability)
      return projected === undefined ? [] : [projected]
    }))],
    providers: [],
    overrides: {},
  }
}
