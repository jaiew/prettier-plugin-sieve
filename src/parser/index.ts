import type { Script, SourceLocation } from '../types.js'
import { parse as generatedParse } from './generated/sieve-parser.js'

export function parse(text: string): Script {
  try {
    return generatedParse(text, { grammarSource: '<sieve>' }) as Script
  } catch (err: unknown) {
    if (err instanceof Error) throw err
    throw new Error(String(err), { cause: err })
  }
}

export function locStart(node: { loc?: SourceLocation }): number {
  return node.loc?.start.offset ?? 0
}

export function locEnd(node: { loc?: SourceLocation }): number {
  return node.loc?.end.offset ?? 0
}
