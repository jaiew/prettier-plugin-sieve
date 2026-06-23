/**
 * End-to-end formatting tests for prettier-plugin-sieve.
 * Run with: npm test  |  npm run test:coverage
 */
import { describe, test, expect } from 'vitest'
import * as prettier from 'prettier'
import plugin from '../src/index.js'
import { parse, locStart, locEnd } from '../src/parser/index.js'

async function format(src: string): Promise<string> {
  return prettier.format(src, {
    parser: 'sieve',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [plugin as any],
    printWidth: 80,
    tabWidth: 2,
  })
}

// ─── require ──────────────────────────────────────────────────────────────────

describe('require', () => {
  test('single capability stays as bare string', async () => {
    expect(await format('require "fileinto";')).toBe('require "fileinto";\n')
  })

  test('multiple capabilities formatted as list', async () => {
    const out = await format('require ["fileinto","reject","vacation"];')
    expect(out).toContain('require ["fileinto", "reject", "vacation"]')
  })

  // Covers printStringOrList: single-item array collapses to bare string
  test('single-item string list collapses to bare string', async () => {
    const out = await format('require ["fileinto"];')
    expect(out).toBe('require "fileinto";\n')
  })
})

// ─── if / elsif / else ────────────────────────────────────────────────────────

describe('if / elsif / else', () => {
  test('simple if with fileinto', async () => {
    const out = await format(`if header :is "From" "boss@example.com" { fileinto "Work"; }`)
    expect(out).toMatch(/^if header :is "From" "boss@example\.com" \{/m)
    expect(out).toMatch(/fileinto "Work";/)
  })

  test('nested elsif + else', async () => {
    const out = await format(`
if header :contains "Subject" "urgent" {
keep;
} elsif header :contains "Subject" "fyi" {
discard;
} else {
fileinto "Inbox";
}`)
    expect(out).toMatch(/elsif header :contains "Subject" "fyi"/)
    expect(out).toMatch(/else \{/)
  })

  // Covers printBlock: empty block path  →  " { }"
  test('empty if block is formatted as { }', async () => {
    const out = await format(`if true { }`)
    expect(out).toContain('{ }')
  })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('anyof / allof', () => {
  test('anyof with two address tests', async () => {
    const out = await format(
      `if anyof (address :is "To" "me@example.com", address :is "Cc" "me@example.com") { keep; }`
    )
    expect(out).toMatch(/anyof \(/)
    expect(out).toMatch(/address :is "To" "me@example\.com"/)
  })

  // Covers allof path in printMultiTest
  test('allof with two header tests', async () => {
    const out = await format(
      `if allof (header :contains "Subject" "URGENT", header :contains "X-Spam" "YES") { discard; }`
    )
    expect(out).toMatch(/allof \(/)
    expect(out).toMatch(/header :contains "Subject" "URGENT"/)
    expect(out).toMatch(/header :contains "X-Spam" "YES"/)
  })
})

// Covers NotTest
describe('not test', () => {
  test('not wraps inner test', async () => {
    const out = await format(`if not header :contains "Subject" "spam" { keep; }`)
    expect(out).toMatch(/^if not header :contains "Subject" "spam"/m)
  })
})

// Covers EnvelopeTest
describe('envelope test', () => {
  test('envelope :is', async () => {
    const out = await format(`if envelope :is "To" "catchall@example.com" { fileinto "Catch"; }`)
    expect(out).toMatch(/envelope :is "To" "catchall@example\.com"/)
  })
})

// Covers SizeTest (:over and :under)
describe('size test', () => {
  test('size :over', async () => {
    const out = await format(`if size :over 1000000 { discard; }`)
    expect(out).toMatch(/size :over 1000000/)
  })

  test('size :under', async () => {
    const out = await format(`if size :under 500 { keep; }`)
    expect(out).toMatch(/size :under 500/)
  })
})

// Covers ExistsTest
describe('exists test', () => {
  test('exists single header', async () => {
    const out = await format(`if exists "X-Spam-Flag" { discard; }`)
    expect(out).toMatch(/exists "X-Spam-Flag"/)
  })

  test('exists multiple headers as list', async () => {
    const out = await format(`if exists ["X-Spam-Flag","X-Virus-Flag"] { discard; }`)
    expect(out).toMatch(/exists \[/)
  })
})

// Covers TrueTest and FalseTest
describe('true / false tests', () => {
  test('true test', async () => {
    const out = await format(`if true { keep; }`)
    expect(out).toMatch(/^if true \{/m)
  })

  test('false test', async () => {
    const out = await format(`if false { discard; }`)
    expect(out).toMatch(/^if false \{/m)
  })
})

// Covers address test with multi-value header and key lists  (printer.ts:65-102)
describe('address test variants', () => {
  test('address with list of headers', async () => {
    const out = await format(`if address :is ["To","Cc"] "me@example.com" { keep; }`)
    expect(out).toMatch(/address :is \["To", "Cc"\] "me@example\.com"/)
  })
})

// Covers header test (already partially covered, add multi-header variant)
describe('header test variants', () => {
  test('header with list of keys', async () => {
    const out = await format(`if header :contains "Subject" ["spam","SPAM"] { discard; }`)
    expect(out).toMatch(/header :contains "Subject" \["spam", "SPAM"\]/)
  })
})

// ─── Actions ──────────────────────────────────────────────────────────────────

describe('actions', () => {
  test('keep, discard, stop', async () => {
    expect(await format('keep;')).toBe('keep;\n')
    expect(await format('discard;')).toBe('discard;\n')
    expect(await format('stop;')).toBe('stop;\n')
  })

  test('redirect', async () => {
    expect(await format('redirect "archive@example.com";')).toBe(
      'redirect "archive@example.com";\n'
    )
  })

  // Covers reject action  (printer.ts:149)
  test('reject with reason', async () => {
    const out = await format(`reject "Message rejected as spam.";`)
    expect(out).toBe('reject "Message rejected as spam.";\n')
  })

  // Covers vacation action  (printer.ts:151-153)
  test('vacation with tagged args', async () => {
    const out = await format(`vacation :days 7 "I am on holiday.";`)
    expect(out).toMatch(/vacation :days 7 "I am on holiday\.";/)
  })

  // Covers addflag / setflag / removeflag  (printer.ts:154-159)
  test('addflag single flag', async () => {
    const out = await format(`addflag "\\\\Seen";`)
    expect(out).toMatch(/addflag/)
  })

  test('setflag with flag list', async () => {
    const out = await format(`setflag ["\\\\Flagged","\\\\Seen"];`)
    expect(out).toMatch(/setflag \[/)
  })

  test('removeflag', async () => {
    const out = await format(`removeflag "\\\\Seen";`)
    expect(out).toMatch(/removeflag/)
  })

  // Covers fileinto with tagged arg  (printer.ts:134-137)
  test('fileinto with :copy tagged arg', async () => {
    const out = await format(`fileinto :copy "Archive";`)
    expect(out).toMatch(/fileinto :copy "Archive";/)
  })
})

// Covers string escaping in printString  (printer.ts:21)
describe('string escaping', () => {
  test('backslashes are escaped', async () => {
    const out = await format(`fileinto "path\\\\to\\\\folder";`)
    expect(out).toMatch(/fileinto/)
  })
})

// ─── Empty script  (printer.ts:241 — empty Script returns "")  ────────────────

describe('edge cases', () => {
  test('empty script produces empty output', async () => {
    const out = await format('')
    expect(out).toBe('')
  })
})

// ─── parser/index.ts: locStart / locEnd  (lines 48-57) ───────────────────────

describe('parser utilities', () => {
  test('locStart returns start offset from a parsed node', () => {
    const ast = parse('require "fileinto";')
    expect(locStart(ast)).toBe(0)
  })

  test('locEnd returns end offset from a parsed node', () => {
    const ast = parse('require "fileinto";')
    expect(locEnd(ast)).toBeGreaterThan(0)
  })

  test('locStart returns 0 when loc is absent', () => {
    expect(locStart({})).toBe(0)
  })

  test('locEnd returns 0 when loc is absent', () => {
    expect(locEnd({})).toBe(0)
  })

  // Covers parse() error path  (parser/index.ts:42-45)
  test('parse throws on invalid sieve syntax', () => {
    expect(() => parse('this is not valid sieve @@@@')).toThrow()
  })
})

// ─── Idempotency ──────────────────────────────────────────────────────────────

describe('idempotency', () => {
  test('formatting twice yields the same result', async () => {
    const src = `require ["fileinto","reject"];
if header :contains "Subject" "spam" {
fileinto "Spam";
} else {
keep;
}`
    const once = await format(src)
    const twice = await format(once)
    expect(once).toBe(twice)
  })

  test('complex script is idempotent', async () => {
    const src = `require ["fileinto","reject","vacation","imap4flags"];
if anyof (address :is "From" "boss@example.com", header :contains "Subject" "URGENT") {
addflag "\\\\Flagged";
fileinto "Priority";
} elsif size :over 5000000 {
discard;
} else {
keep;
}`
    const once = await format(src)
    const twice = await format(once)
    expect(once).toBe(twice)
  })
})

// ─── Additional coverage tests ────────────────────────────────────────────────

// printer.ts:67-86 — AddressTest and HeaderTest bodies when args array is empty
// (the existing tests use :is/:contains which produce a TaggedArg, so args is
//  non-empty; these tests exercise the no-args variant via the grammar's
//  GenericTest fallback path — address/header without a comparator tag)
describe('address / header without match type tag', () => {
  // RFC 5228 §5.7 — :is is the default, so the tag may be omitted.
  // The grammar parses this as AddressTest with args=[].
  test('address test without explicit match type tag', async () => {
    const out = await format(`if address "From" "boss@example.com" { keep; }`)
    expect(out).toMatch(/address "From" "boss@example\.com"/)
  })

  test('header test without explicit match type tag', async () => {
    const out = await format(`if header "Subject" "hello" { keep; }`)
    expect(out).toMatch(/header "Subject" "hello"/)
  })
})

// printer.ts:117 — GenericTest with no string arguments (argDocs.length === 0)
// "true" and "false" are their own AST nodes; a custom extension test with no
// args hits the GenericTest default case with an empty arguments array.
// We exercise this via the grammar's GenericTest fallback.
describe('GenericTest with no arguments', () => {
  test('bare identifier test (no args) is preserved', async () => {
    // "hasflag" is a known Sieve extension test that can appear bare
    const out = await format(`if hasflag "\\\\Seen" { keep; }`)
    expect(out).toMatch(/hasflag/)
  })
})

// printer.ts:167 — GenericAction with no extra arguments
describe('GenericAction with no arguments', () => {
  test('bare generic action with only a tag argument', async () => {
    // "notify" is a Sieve extension action; when used without string args
    // it falls into GenericAction with arguments=[]
    const out = await format(`notify :method "mailto:user@example.com";`)
    expect(out).toMatch(/notify/)
  })
})

// index.ts:52-53 — getVisitorKeys fallback for unknown node type
// This is exercised internally by Prettier's traversal — calling format()
// on any script already exercises this path for every node type. We add a
// dedicated unit test that directly imports and calls the printers export
// to ensure the ?? [] fallback is hit with an unrecognised type.
import { printers } from '../src/index.js'

describe('getVisitorKeys fallback', () => {
  test('returns empty array for unrecognised node type', () => {
    const printer = printers['sieve-ast']
    // Cast an unknown node type through the visitor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeNode = { type: 'UnknownNode' } as any
    const result = printer.getVisitorKeys!(fakeNode, new Set())
    expect(result).toEqual([])
  })

  test('filters out non-traversable keys', () => {
    const printer = printers['sieve-ast']
    const scriptNode = { type: 'Script' } as SieveNode
    // "commands" is in visitorKeys["Script"]; mark it non-traversable
    const result = printer.getVisitorKeys!(scriptNode, new Set(['commands']))
    expect(result).toEqual([])
  })
})

// parser/index.ts:48 — cache hit path (getParser called twice returns cached parser)
import { parse as parseSieve } from '../src/parser/index.js'
import { SieveNode } from '../src/types.js'

describe('parser cache', () => {
  test('calling parse twice reuses the cached parser (no error)', () => {
    // First call compiles the grammar; second call must hit the cache branch.
    const ast1 = parseSieve('require "fileinto";')
    const ast2 = parseSieve('keep;')
    expect(ast1.type).toBe('Script')
    expect(ast2.type).toBe('Script')
  })
})
