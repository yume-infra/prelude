import { Schema } from 'effect'

import { PackageRootSchema, RelativePathSchema, RootRelativePathSchema } from './primitives.js'

function locatorSchemas<Path extends Schema.Top>(path: Path) {
  return Schema.Union([
    Schema.Struct({
      root: Schema.Literal('ControlRoot'),
      path,
    }),
    Schema.Struct({
      root: Schema.Literal('IntegrationWorkspace'),
      path,
    }),
    Schema.Struct({
      root: Schema.Literal('PackageRoot'),
      packageRoot: PackageRootSchema,
      path,
    }),
  ])
}

export const OutputLocatorSchema = locatorSchemas(RelativePathSchema).pipe(
  Schema.check(Schema.makeFilter(
    locator => locator.root !== 'IntegrationWorkspace'
      || (locator.path !== 'feedback' && !locator.path.startsWith('feedback/')),
    { expected: 'an Output locator outside the Target-owned feedback zone' },
  )),
)
export type OutputLocator = Schema.Schema.Type<typeof OutputLocatorSchema>

export const ObservationLocatorSchema = locatorSchemas(RootRelativePathSchema)
export type ObservationLocator = Schema.Schema.Type<typeof ObservationLocatorSchema>
