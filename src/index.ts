/**
 * prettier-plugin-sieve
 *
 * Prettier plugin for formatting Sieve email filtering scripts (RFC 5228).
 */

import type {
  Plugin,
  SupportLanguage,
  Parser,
  Printer,
  ParserOptions,
  AstPath,
  Doc,
} from 'prettier'
import { parse, locStart, locEnd } from './parser/index.js'
import { print, visitorKeys } from './printer.js'
import type { SieveNode } from './types.js'

// ─── Language registration ────────────────────────────────────────────────────

const languages: SupportLanguage[] = [
  {
    name: 'Sieve',
    parsers: ['sieve'],
    extensions: ['.sieve', '.siv'],
    vscodeLanguageIds: ['sieve'],
    linguistLanguageId: 929588100,
  },
]

// ─── Parser registration ──────────────────────────────────────────────────────

const parsers: Record<string, Parser<SieveNode>> = {
  sieve: {
    parse,
    astFormat: 'sieve-ast',
    locStart,
    locEnd,
  },
}

// ─── Printer registration ─────────────────────────────────────────────────────
// Prettier 3.x Printer<T>.print signature:
//   (path: AstPath<T>, options: ParserOptions<T>, print: (path: AstPath<T>) => Doc, args?: unknown) => Doc
//
// We cast via `satisfies` rather than explicit annotation to let TS validate
// the shape without fighting the structural subtype mismatch on the callback.

const sievePrinter = {
  print(
    path: AstPath<SieveNode>,
    options: ParserOptions<SieveNode>,
    printFn: (path: AstPath<SieveNode>) => Doc,
    args?: unknown
  ): Doc {
    return print(path, options, printFn, args)
  },
  getVisitorKeys(node: SieveNode, nonTraversableKeys: Set<string>): string[] {
    const keys = visitorKeys[node.type] ?? []
    return keys.filter((k) => !nonTraversableKeys.has(k))
  },
} satisfies Printer<SieveNode>

const printers: Record<string, Printer<SieveNode>> = {
  'sieve-ast': sievePrinter,
}

// ─── Plugin export ────────────────────────────────────────────────────────────

const plugin: Plugin<SieveNode> = {
  languages,
  parsers,
  printers,
}

export default plugin
export { languages, parsers, printers }
