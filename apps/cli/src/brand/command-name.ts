import { Schema } from 'effect'

const CommandNameSchema = Schema.String.pipe(
  Schema.brand('CommandName'),
  Schema.annotations({
    identifier: 'CommandName',
    title: 'CommandName',
  }),
)

export type CommandName = Schema.Schema.Type<typeof CommandNameSchema>

export const makeCommandName = (value: string): CommandName => CommandNameSchema.make(value)
