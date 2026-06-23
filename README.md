# prettier-plugin-sieve

A [Prettier](https://prettier.io/) plugin for formatting [Sieve](https://www.rfc-editor.org/rfc/rfc5228) email filtering scripts (RFC 5228).

## Features

- Formats `.sieve` / `.siv` files via Prettier
- Hand-rolled Peggy.js PEG grammar for RFC 5228 core language
- Supports: `require`, `if`/`elsif`/`else`, all standard tests (`address`, `header`, `envelope`, `allof`, `anyof`, `not`, `size`, `exists`, `true`, `false`), all standard actions (`fileinto`, `redirect`, `keep`, `discard`, `stop`, `reject`, `vacation`, `addflag`, `setflag`, `removeflag`)
- Idempotent — formatting twice gives the same result
- Works with Prettier 3.x
- IntelliJ IDEA + VS Code Prettier extension compatible

## Installation

```bash
npm install --save-dev prettier prettier-plugin-sieve
```

## Configuration

### `.prettierrc`

```json
{
  "plugins": ["prettier-plugin-sieve"]
}
```

### VS Code (`settings.json`)

```json
{
  "prettier.documentSelectors": ["**/*.sieve", "**/*.siv"],
  "[sieve]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}
```

### IntelliJ IDEA

Go to **Settings → Languages & Frameworks → JavaScript → Prettier**:

- Enable _"Run on save"_
- Add `**/*.sieve` to the _"Run for files"_ glob

## Usage

```bash
# Format all .sieve files
npx prettier --write "**/*.sieve"

# Check formatting without writing
npx prettier --check "**/*.sieve"
```

## Example

**Input** (messy):

```sieve
require ["fileinto","reject","vacation"];
if anyof(header :contains "Subject" "URGENT",address :is "From" "boss@example.com"){fileinto "Priority";}
elsif header:contains "Subject" "[SPAM]"{discard;}
else{keep;}
```

**Output** (formatted):

```sieve
require ["fileinto", "reject", "vacation"];
if anyof (
  header :contains "Subject" "URGENT",
  address :is "From" "boss@example.com"
) {
  fileinto "Priority";
} elsif header :contains "Subject" "[SPAM]" {
  discard;
} else {
  keep;
}
```

## Project Structure

```
prettier-plugin-sieve/
├── src/
│   ├── index.ts               # Plugin entry: languages, parsers, printers
│   ├── types.ts               # Full TypeScript AST node interfaces
│   ├── printer.ts             # Prettier Doc builder / printer
│   └── parser/
│       ├── index.ts           # parse(), locStart(), locEnd() exports
│       └── sieve.pegjs        # Peggy PEG grammar for RFC 5228
├── tests/
│   └── format.test.ts         # Jest end-to-end formatting tests
├── package.json
└── tsconfig.json
```

## Architecture

### 1 · Grammar (`src/parser/sieve.pegjs`)

A [Peggy](https://peggyjs.org/) PEG grammar that directly encodes RFC 5228 syntax. Each grammar rule returns a typed AST node with a `loc` (source location) property. The grammar is compiled at runtime the first time `parse()` is called (or can be pre-compiled via `npm run generate-parser` for production builds).

### 2 · Parser adapter (`src/parser/index.ts`)

Wraps Peggy's `parse()` to:

- Return a `Script` root node
- Expose `locStart` / `locEnd` so Prettier can attach comments
- Surface grammar errors with human-readable messages

### 3 · Printer (`src/printer.ts`)

Converts the Sieve AST into Prettier's **Doc IR** using the `doc.builders` API:

| Doc primitive | Where used                                                           |
| ------------- | -------------------------------------------------------------------- |
| `hardline`    | Between top-level commands and block contents                        |
| `softline`    | Inside string lists, test argument lists                             |
| `group`       | All commands and tests — allows line-breaking when over `printWidth` |
| `indent`      | Block bodies, multi-line list arguments                              |
| `join`        | Comma-separated string lists and test lists                          |

## Building

```bash
# Compile TypeScript → dist/
npm run build

# Optionally pre-compile the Peggy grammar to JS for faster startup
npm run generate-parser
```

## Testing

```bash
npm test
```

## Extending

To add support for Sieve extensions (e.g. RFC 5232 _sieve-imap-flags_, RFC 5230 _vacation_):

1. Add new rules to `src/parser/sieve.pegjs`
2. Add new AST interfaces to `src/types.ts`
3. Add `case` branches to `printAction` / `printTest` in `src/printer.ts`

## License

MIT
