import { Schema } from 'effect'

export const PackageNameSchema = Schema.String.pipe(
  Schema.brand('PackageName'),
  Schema.annotations({
    identifier: 'PackageName',
    title: 'PackageName',
  }),
)

export type PackageName = Schema.Schema.Type<typeof PackageNameSchema>

export const makePackageName = (value: string): PackageName => PackageNameSchema.make(value)
