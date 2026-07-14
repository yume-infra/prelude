import { Schema } from 'effect'

const decodeUnknownJsonString = Schema.decodeUnknownSync(Schema.UnknownFromJsonString)
const encodeUnknownJsonString = Schema.encodeSync(Schema.UnknownFromJsonString)

export function decodeJson(source: string): unknown {
  return decodeUnknownJsonString(source)
}

export function encodeJson(value: unknown): string {
  return encodeUnknownJsonString(value)
}
