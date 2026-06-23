// ─── Sieve AST Node types ────────────────────────────────────────────────────

export interface SourceLocation {
  start: { offset: number; line: number; column: number }
  end: { offset: number; line: number; column: number }
}

interface BaseNode {
  type: string
  loc?: SourceLocation
  comments?: Comment[]
}

export interface Script extends BaseNode {
  type: 'Script'
  commands: Command[]
}

export interface Require extends BaseNode {
  type: 'Require'
  capabilities: string[]
}

export interface If extends BaseNode {
  type: 'If'
  test: Test
  block: Block
  elseifs: ElseIf[]
  else: Else | null
}

export interface ElseIf extends BaseNode {
  type: 'ElseIf'
  test: Test
  block: Block
}

export interface Else extends BaseNode {
  type: 'Else'
  block: Block
}

export interface Block extends BaseNode {
  type: 'Block'
  commands: Command[]
}

// Tests
export interface AllofTest extends BaseNode {
  type: 'AllofTest'
  tests: Test[]
}
export interface AnyofTest extends BaseNode {
  type: 'AnyofTest'
  tests: Test[]
}
export interface NotTest extends BaseNode {
  type: 'NotTest'
  test: Test
}
export interface AddressTest extends BaseNode {
  type: 'AddressTest'
  args: TaggedArg[]
  headers: string[]
  keys: string[]
}
export interface HeaderTest extends BaseNode {
  type: 'HeaderTest'
  args: TaggedArg[]
  headers: string[]
  keys: string[]
}
export interface EnvelopeTest extends BaseNode {
  type: 'EnvelopeTest'
  args: TaggedArg[]
  parts: string[]
  keys: string[]
}
export interface SizeTest extends BaseNode {
  type: 'SizeTest'
  qualifier: 'over' | 'under'
  size: number
}
export interface ExistsTest extends BaseNode {
  type: 'ExistsTest'
  headers: string[]
}
export interface TrueTest extends BaseNode {
  type: 'TrueTest'
}
export interface FalseTest extends BaseNode {
  type: 'FalseTest'
}
export interface GenericTest extends BaseNode {
  type: 'GenericTest'
  name: string
  args: TaggedArg[]
  arguments: Argument[]
}

// Actions
export interface FileInto extends BaseNode {
  type: 'FileInto'
  args: TaggedArg[]
  folder: string
}
export interface Redirect extends BaseNode {
  type: 'Redirect'
  args: TaggedArg[]
  address: string
}
export interface Keep extends BaseNode {
  type: 'Keep'
}
export interface Discard extends BaseNode {
  type: 'Discard'
}
export interface Stop extends BaseNode {
  type: 'Stop'
}
export interface Reject extends BaseNode {
  type: 'Reject'
  reason: string
}
export interface Vacation extends BaseNode {
  type: 'Vacation'
  args: TaggedArg[]
  reason: string
}
export interface AddFlag extends BaseNode {
  type: 'AddFlag'
  flags: string[]
}
export interface SetFlag extends BaseNode {
  type: 'SetFlag'
  flags: string[]
}
export interface RemoveFlag extends BaseNode {
  type: 'RemoveFlag'
  flags: string[]
}
export interface GenericAction extends BaseNode {
  type: 'GenericAction'
  name: string
  args: TaggedArg[]
  arguments: Argument[]
}

// Shared
export interface TaggedArg extends BaseNode {
  type: 'TaggedArg'
  name: string
  value: Argument | null
}

export interface Comment extends BaseNode {
  type: 'LineComment' | 'BlockComment'
  value: string
}

export type Argument = string | string[] | number

export type Test =
  | AllofTest
  | AnyofTest
  | NotTest
  | AddressTest
  | HeaderTest
  | EnvelopeTest
  | SizeTest
  | ExistsTest
  | TrueTest
  | FalseTest
  | GenericTest

export type Action =
  | FileInto
  | Redirect
  | Keep
  | Discard
  | Stop
  | Reject
  | Vacation
  | AddFlag
  | SetFlag
  | RemoveFlag
  | GenericAction

export type Command = Require | If | Action

export type SieveNode = Script | Require | If | ElseIf | Else | Block | Test | Action | TaggedArg
