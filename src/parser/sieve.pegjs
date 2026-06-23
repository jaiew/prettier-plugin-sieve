/*
 * Sieve Email Filtering Language Grammar (RFC 5228)
 * PEG grammar for Peggy.js
 *
 * Covers core RFC 5228 constructs:
 *   - require declarations
 *   - if / elsif / else
 *   - tests: address, header, envelope, allof, anyof, not, size, exists, true, false
 *   - actions: fileinto, redirect, keep, discard, reject, stop, vacation, addflag, setflag, removeflag
 *   - tagged arguments (:is, :matches, :contains, :over, :under, :all, :localpart, :domain, etc.)
 *   - string lists  "foo"  ["foo", "bar"]
 *   - block { ... }
 *   - line comments  # ...
 *   - block comments /* ... * /
 */

{
  function buildNode(type, props, location) {
    return Object.assign({ type, loc: location() }, props);
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────

Script
  = _ commands:Command* _
  { return buildNode("Script", { commands }, location); }

Command
  = RequireCommand
  / IfCommand
  / ActionCommand

// ─── Require ─────────────────────────────────────────────────────────────────

RequireCommand
  = "require" __ capabilities:StringListOrString _ ";" _
  { return buildNode("Require", { capabilities: Array.isArray(capabilities) ? capabilities : [capabilities] }, location); }

// ─── If / elsif / else ───────────────────────────────────────────────────────

IfCommand
  = "if" __ test:Test _ block:Block _
    elseifs:ElseIf*
    els:Else?
  { return buildNode("If", { test, block, elseifs, else: els }, location); }

ElseIf
  = "elsif" __ test:Test _ block:Block _
  { return buildNode("ElseIf", { test, block }, location); }

Else
  = "else" _ block:Block _
  { return buildNode("Else", { block }, location); }

// ─── Tests ───────────────────────────────────────────────────────────────────

Test
  = AllofTest
  / AnyofTest
  / NotTest
  / AddressTest
  / HeaderTest
  / EnvelopeTest
  / SizeTest
  / ExistsTest
  / TrueTest
  / FalseTest
  / GenericTest

AllofTest
  = "allof" _ "(" _ tests:TestList _ ")"
  { return buildNode("AllofTest", { tests }, location); }

AnyofTest
  = "anyof" _ "(" _ tests:TestList _ ")"
  { return buildNode("AnyofTest", { tests }, location); }

TestList
  = head:Test tail:(_ "," _ t:Test { return t; })*
  { return [head, ...tail]; }

NotTest
  = "not" __ test:Test
  { return buildNode("NotTest", { test }, location); }

AddressTest
  = "address" args:TaggedArg* _ headers:StringListOrString _ keys:StringListOrString
  { return buildNode("AddressTest", { args, headers: Array.isArray(headers) ? headers : [headers], keys: Array.isArray(keys) ? keys : [keys] }, location); }

HeaderTest
  = "header" args:TaggedArg* _ headers:StringListOrString _ keys:StringListOrString
  { return buildNode("HeaderTest", { args, headers: Array.isArray(headers) ? headers : [headers], keys: Array.isArray(keys) ? keys : [keys] }, location); }

EnvelopeTest
  = "envelope" args:TaggedArg* _ parts:StringListOrString _ keys:StringListOrString
  { return buildNode("EnvelopeTest", { args, parts: Array.isArray(parts) ? parts : [parts], keys: Array.isArray(keys) ? keys : [keys] }, location); }

SizeTest
  = "size" _ qualifier:SizeQualifier _ n:Number
  { return buildNode("SizeTest", { qualifier, size: n }, location); }

SizeQualifier
  = ":over"  { return "over"; }
  / ":under" { return "under"; }

ExistsTest
  = "exists" _ headers:StringListOrString
  { return buildNode("ExistsTest", { headers: Array.isArray(headers) ? headers : [headers] }, location); }

TrueTest
  = "true" { return buildNode("TrueTest", {}, location); }

FalseTest
  = "false" { return buildNode("FalseTest", {}, location); }

GenericTest
  = name:Identifier args:TaggedArg* arguments_:Argument*
  { return buildNode("GenericTest", { name, args, arguments: arguments_ }, location); }

// ─── Action commands ─────────────────────────────────────────────────────────

ActionCommand
  = FileIntoAction
  / RedirectAction
  / RejectAction
  / VacationAction
  / AddFlagAction
  / SetFlagAction
  / RemoveFlagAction
  / KeepAction
  / DiscardAction
  / StopAction
  / GenericAction

FileIntoAction
  = "fileinto" args:TaggedArg* _ folder:StringLiteral _ ";" _
  { return buildNode("FileInto", { args, folder }, location); }

RedirectAction
  = "redirect" args:TaggedArg* _ address:StringLiteral _ ";" _
  { return buildNode("Redirect", { args, address }, location); }

RejectAction
  = "reject" _ reason:StringLiteral _ ";" _
  { return buildNode("Reject", { reason }, location); }

VacationAction
  = "vacation" args:TaggedArg* _ reason:StringLiteral _ ";" _
  { return buildNode("Vacation", { args, reason }, location); }

AddFlagAction
  = "addflag" _ flags:StringListOrString _ ";" _
  { return buildNode("AddFlag", { flags: Array.isArray(flags) ? flags : [flags] }, location); }

SetFlagAction
  = "setflag" _ flags:StringListOrString _ ";" _
  { return buildNode("SetFlag", { flags: Array.isArray(flags) ? flags : [flags] }, location); }

RemoveFlagAction
  = "removeflag" _ flags:StringListOrString _ ";" _
  { return buildNode("RemoveFlag", { flags: Array.isArray(flags) ? flags : [flags] }, location); }

KeepAction
  = "keep" _ ";" _ { return buildNode("Keep", {}, location); }

DiscardAction
  = "discard" _ ";" _ { return buildNode("Discard", {}, location); }

StopAction
  = "stop" _ ";" _ { return buildNode("Stop", {}, location); }

GenericAction
  = name:Identifier args:TaggedArg* arguments_:Argument* _ ";" _
  { return buildNode("GenericAction", { name, args, arguments: arguments_ }, location); }

// ─── Block ───────────────────────────────────────────────────────────────────

Block
  = "{" _ commands:Command* _ "}"
  { return buildNode("Block", { commands }, location); }

// ─── Arguments ───────────────────────────────────────────────────────────────

TaggedArg
  = _ ":" name:Identifier value:(_ v:Argument { return v; })?
  { return buildNode("TaggedArg", { name, value: value ?? null }, location); }

Argument
  = _ v:StringListOrString { return v; }
  / _ v:Number { return v; }

// ─── String / list / number ──────────────────────────────────────────────────

StringListOrString
  = StringList
  / StringLiteral

StringList
  = "[" _ head:StringLiteral tail:(_ "," _ s:StringLiteral { return s; })* _ "]"
  { return [head, ...tail]; }

StringLiteral "string"
  = '"' chars:StringChar* '"'
  { return chars.join(""); }

StringChar
  = !'"' !"\\" c:. { return c; }
  / "\\" c:. { return c; }

Number
  = digits:[0-9]+ { return parseInt(digits.join(""), 10); }

Identifier
  = head:[a-zA-Z_] tail:[a-zA-Z0-9_-]* { return head + tail.join(""); }

// ─── Whitespace and comments ─────────────────────────────────────────────────

_ "optional whitespace"
  = (Whitespace / LineComment / BlockComment)*

__ "required whitespace"
  = (Whitespace / LineComment / BlockComment)+

Whitespace
  = [\t\n\r ]+

LineComment
  = "#" (!"\n" .)* "\n"?

BlockComment
  = "/*" (!"*/" .)* "*/"
