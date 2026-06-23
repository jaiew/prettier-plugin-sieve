import type { AstPath, Doc, ParserOptions } from 'prettier'
import { doc } from 'prettier'
import type {
  SieveNode,
  Script,
  Require,
  If,
  AllofTest,
  AnyofTest,
  NotTest,
  AddressTest,
  HeaderTest,
  EnvelopeTest,
  SizeTest,
  ExistsTest,
  GenericTest,
  FileInto,
  Redirect,
  Reject,
  Vacation,
  AddFlag,
  SetFlag,
  RemoveFlag,
  GenericAction,
  TaggedArg,
  Test,
  Action,
} from './types.js'

const { hardline, softline, line, group, indent, join } = doc.builders

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Print a Sieve string literal with double quotes. */
function printString(value: string): Doc {
  // Escape inner double-quotes and backslashes.
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

/** Print a string or a string list.  Single items → bare string. */
function printStringOrList(value: string | string[]): Doc {
  if (typeof value === 'string') return printString(value)
  if (value.length === 1) return printString(value[0])
  return group(['[', indent([softline, join([',', line], value.map(printString))]), softline, ']'])
}

/** Print the tagged-argument list that precedes a test or action's string args. */
function printTaggedArgs(args: TaggedArg[]): Doc {
  if (args.length === 0) return ''
  return [' ', join(' ', args.map(printTaggedArg))]
}

function printTaggedArg(arg: TaggedArg): Doc {
  const tag: Doc = `:${arg.name}`
  if (arg.value === null) return tag
  if (typeof arg.value === 'string') return [tag, ' ', printString(arg.value)]
  if (Array.isArray(arg.value)) return [tag, ' ', printStringOrList(arg.value)]
  return [tag, ' ', String(arg.value)]
}

// ─── Test printer ─────────────────────────────────────────────────────────────

function printTest(test: Test): Doc {
  switch (test.type) {
    case 'AllofTest':
      return printMultiTest('allof', (test as AllofTest).tests)
    case 'AnyofTest':
      return printMultiTest('anyof', (test as AnyofTest).tests)
    case 'NotTest':
      return ['not ', printTest((test as NotTest).test)]
    case 'AddressTest': {
      const t = test as AddressTest
      return group([
        'address',
        printTaggedArgs(t.args),
        ' ',
        printStringOrList(t.headers),
        ' ',
        printStringOrList(t.keys),
      ])
    }
    case 'HeaderTest': {
      const t = test as HeaderTest
      return group([
        'header',
        printTaggedArgs(t.args),
        ' ',
        printStringOrList(t.headers),
        ' ',
        printStringOrList(t.keys),
      ])
    }
    case 'EnvelopeTest': {
      const t = test as EnvelopeTest
      return group([
        'envelope',
        printTaggedArgs(t.args),
        ' ',
        printStringOrList(t.parts),
        ' ',
        printStringOrList(t.keys),
      ])
    }
    case 'SizeTest': {
      const t = test as SizeTest
      return `size :${t.qualifier} ${t.size}`
    }
    case 'ExistsTest':
      return group(['exists ', printStringOrList((test as ExistsTest).headers)])
    case 'TrueTest':
      return 'true'
    case 'FalseTest':
      return 'false'
    case 'GenericTest': {
      const t = test as GenericTest
      const argDocs: Doc[] = t.arguments.map((a) =>
        typeof a === 'string' ? printString(a) : Array.isArray(a) ? printStringOrList(a) : String(a)
      )
      return group([
        t.name,
        printTaggedArgs(t.args),
        ...(argDocs.length > 0 ? [' ', join(' ', argDocs)] : []),
      ])
    }
    default:
      return `/* unknown test: ${(test as SieveNode).type} */`
  }
}

function printMultiTest(keyword: string, tests: Test[]): Doc {
  return group([
    keyword,
    ' (',
    indent([softline, join([',', hardline], tests.map(printTest))]),
    softline,
    ')',
  ])
}

// ─── Action printer ──────────────────────────────────────────────────────────

function printAction(action: Action): Doc {
  switch (action.type) {
    case 'FileInto': {
      const a = action as FileInto
      return group(['fileinto', printTaggedArgs(a.args), ' ', printString(a.folder), ';'])
    }
    case 'Redirect': {
      const a = action as Redirect
      return group(['redirect', printTaggedArgs(a.args), ' ', printString(a.address), ';'])
    }
    case 'Keep':
      return 'keep;'
    case 'Discard':
      return 'discard;'
    case 'Stop':
      return 'stop;'
    case 'Reject':
      return group(['reject ', printString((action as Reject).reason), ';'])
    case 'Vacation': {
      const a = action as Vacation
      return group(['vacation', printTaggedArgs(a.args), ' ', printString(a.reason), ';'])
    }
    case 'AddFlag':
      return group(['addflag ', printStringOrList((action as AddFlag).flags), ';'])
    case 'SetFlag':
      return group(['setflag ', printStringOrList((action as SetFlag).flags), ';'])
    case 'RemoveFlag':
      return group(['removeflag ', printStringOrList((action as RemoveFlag).flags), ';'])
    case 'GenericAction': {
      const a = action as GenericAction
      const argDocs: Doc[] = a.arguments.map((arg) =>
        typeof arg === 'string'
          ? printString(arg)
          : Array.isArray(arg)
            ? printStringOrList(arg)
            : String(arg)
      )
      return group([
        a.name,
        printTaggedArgs(a.args),
        ...(argDocs.length > 0 ? [' ', join(' ', argDocs)] : []),
        ';',
      ])
    }
    default:
      return `/* unknown action: ${(action as SieveNode).type} */;`
  }
}

// ─── Block printer ────────────────────────────────────────────────────────────

function printBlock(commands: SieveNode[]): Doc {
  if (commands.length === 0) {
    return ' { }'
  }
  return group([
    ' {',
    indent([hardline, join(hardline, commands.map(printCommand))]),
    hardline,
    '}',
  ])
}

// ─── Command printer ─────────────────────────────────────────────────────────

function printCommand(node: SieveNode): Doc {
  switch (node.type) {
    case 'Require': {
      const r = node as Require
      return group(['require ', printStringOrList(r.capabilities), ';'])
    }
    case 'If': {
      const n = node as If
      const docs: Doc[] = [
        group(['if ', printTest(n.test)]),
        printBlock(n.block.commands as SieveNode[]),
      ]
      for (const elseif of n.elseifs) {
        docs.push(
          ' ',
          group(['elsif ', printTest(elseif.test)]),
          printBlock(elseif.block.commands as SieveNode[])
        )
      }
      if (n.else) {
        docs.push(' else', printBlock(n.else.block.commands as SieveNode[]))
      }
      return group(docs)
    }
    default:
      // All action nodes
      return printAction(node as Action)
  }
}

// ─── Top-level print function ─────────────────────────────────────────────────

export function print(
  path: AstPath<SieveNode>,
  _options: ParserOptions<SieveNode>,
  _print: (path: AstPath<SieveNode>) => Doc,
  _args?: unknown
): Doc {
  const node = path.node

  if (node.type === 'Script') {
    const script = node as Script
    if (script.commands.length === 0) return ''
    return [join(hardline, script.commands.map(printCommand)), hardline]
  }

  return printCommand(node)
}

export const visitorKeys: Record<string, string[]> = {
  Script: ['commands'],
  Require: [],
  If: ['test', 'block', 'elseifs', 'else'],
  ElseIf: ['test', 'block'],
  Else: ['block'],
  Block: ['commands'],
  AllofTest: ['tests'],
  AnyofTest: ['tests'],
  NotTest: ['test'],
  AddressTest: ['args'],
  HeaderTest: ['args'],
  EnvelopeTest: ['args'],
  SizeTest: [],
  ExistsTest: [],
  TrueTest: [],
  FalseTest: [],
  GenericTest: ['args'],
  FileInto: ['args'],
  Redirect: ['args'],
  Keep: [],
  Discard: [],
  Stop: [],
  Reject: [],
  Vacation: ['args'],
  AddFlag: [],
  SetFlag: [],
  RemoveFlag: [],
  GenericAction: ['args'],
  TaggedArg: [],
}
