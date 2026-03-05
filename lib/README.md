<p align="center">
<img src="https://raw.githubusercontent.com/prostojs/parser/main/docs/logo.png" width="100%" style="max-width: 900px" />
<a  href="https://github.com/prostojs/parser/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-cyan?style=for-the-badge" />
</a>
</p>

**Build a parser for *anything* — in minutes, not months.**

Stop writing ad-hoc regex spaghetti or reaching for heavyweight parser generators. `@prostojs/parser` gives you composable building blocks: define your nodes, wire them together, and get a working parser with structured output — fast.

## Why This Parser?

**It's LEGO for parsers.** Each node is a self-contained piece — a tag, a string, a comment, an attribute. Snap them together and you have a full grammar. Need to change something? Swap one block, everything else stays.

**Output is built *during* parsing.** Hooks fire as tokens are matched — `onOpen`, `onClose`, `onContent`, `onChild`. Your data is in its final shape the moment parsing ends. No AST-to-output conversion step. No tree walking.

**Near-zero boilerplate.** Write `data: { tag: '', attrs: {} }` and it just works — auto-cloned per match, regex named groups auto-mapped to fields. A full XML-to-JSON parser is [~400 lines](https://github.com/prostojs/parser/tree/main/examples/xml-json).

**Competitive performance.** A general-purpose toolkit parsing XML is [within 4-36%](https://github.com/prostojs/parser/tree/main/examples/xml-json#benchmark-results) of `fast-xml-parser`, a dedicated XML-only library. For most formats you'll parse, there *is* no dedicated alternative — and this is fast enough.

## Install

```sh
npm install @prostojs/parser
```

## 30-Second Overview

Every parser is a tree of **Nodes**. Each node knows how to start, how to end, and what it can contain:

```ts
import { Node, parse } from '@prostojs/parser'

// A string: starts with a quote, ends with the same quote
const string = new Node<{ quote: string }>({
  name: 'string',
  start: { token: /(?<quote>["'])/, omit: true },
  end: { token: (ctx) => ctx.node.data.quote, omit: true },
  data: { quote: '' },
})

// A key=value pair: key captured from regex, value from content
const pair = new Node<{ key: string; value: string }>({
  name: 'pair',
  start: { token: /(?<key>\w+)\s*=\s*/, omit: true },
  end: { token: /\n|$/, omit: true },
  recognizes: [string],
  data: { key: '', value: '' },
  mapContent: 'value',
})

// Root: contains pairs, closes at EOF
const root = new Node({ name: 'root', eofClose: true, recognizes: [pair] })

const result = parse(root, 'name = "Alice"\nage = "30"')
// result.content → [ParsedNode{key:'name', value:'Alice'}, ...]
```

That's a working config file parser. No grammar files, no build step, no code generation.

## How It Works

### 1. Define Nodes

A node is a pattern with a start token, an end token, and typed data:

```ts
const comment = new Node<{ text: string }>({
  name: 'comment',
  start: { token: '<!--', omit: true },
  end: { token: '-->', omit: true },
  data: { text: '' },
  mapContent: 'text',  // auto-joins text content into data.text
})
```

Tokens can be **strings**, **RegExps** (with named capture groups), or **dynamic functions**:

```ts
// String — exact match
start: '{'

// RegExp — captures data automatically
start: { token: /<(?<tag>\w+)/, omit: true }

// Dynamic — computed from current node's data
end: { token: (ctx) => `</${ctx.node.data.tag}>`, omit: true }
```

Token modifiers:
- **`omit`** — strip the token from node content
- **`eject`** — don't consume the match, let the parent handle it
- **`backslash`** — ignore the token if preceded by `\`

### 2. Compose Them

Tell each node what children it can contain:

```ts
const root = new Node({ name: 'root', eofClose: true })
root.recognize(comment, tag, cdata)
tag.recognize(attribute, innerContent)
innerContent.recognize(comment, tag, cdata)
```

That's your grammar. No separate DSL — it's just JavaScript.

### 3. Add Hooks to Shape Output

Hooks fire during parsing — use them to build your output in its final format:

```ts
tag
  .onOpen((node, match) => {
    // start token matched — node.data is ready (named groups already mapped)
    // return false to reject this match
  })
  .onChild((child, node) => {
    // a child node was fully parsed
    // route its data wherever you need it
    if (child.node === attribute) {
      node.data.attrs[child.data.key] = child.data.value
    }
  })
  .onContent((text, node) => {
    // text is about to be added — transform or suppress it
    return text.trim()
  })
  .onClose((node) => {
    // end token matched — finalize the output
  })
```

### 4. Parse

```ts
import { parse } from '@prostojs/parser'

const result = parse(root, sourceString)
// result: ParsedNode with .content, .data, .start, .end
```

## Key Features

### Named Group Auto-Mapping

Regex named groups map directly to `data` fields — available *before* `onOpen` fires:

```ts
const tag = new Node<{ tag: string }>({
  start: { token: /<(?<tag>\w+)/ },
  data: { tag: '' },
})
.onOpen((node) => {
  console.log(node.data.tag) // already populated
})
```

### Plain Data Templates

No factory functions. Just declare a plain object — it's auto-cloned per match with an optimized cloner:

```ts
data: { tag: '', attrs: {}, children: [] }
// primitives → spread clone
// objects/arrays → shallow clone
```

### `mapContent`

Auto-join all text content into a data field on node close. Replaces the most common `onClose` pattern:

```ts
data: { text: '' },
mapContent: 'text',
// equivalent to: .onClose(node => { node.data.text = textContent(node) })
```

### Utilities

```ts
import { textContent, children, findChild, findChildren, walk, printTree } from '@prostojs/parser'

textContent(node)              // joined string content
children(node)                 // child ParsedNodes (no strings)
findChild(node, targetNode)    // first child of a specific node type
findChildren(node, targetNode) // all children of a specific node type
walk(node, (child, depth) => { ... })  // depth-first walk
printTree(node)                // debug visualization
```

## Node Options Reference

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Identifier (for debugging / `printTree`) |
| `start` | `TokenDef \| TokenDef[]` | Start token(s) |
| `end` | `TokenDef \| TokenDef[]` | End token(s) |
| `recognizes` | `Node[]` | Child nodes this node can contain |
| `skip` | `Token \| Token[]` | Tokens to silently skip (e.g. whitespace) |
| `bad` | `Token \| Token[]` | Tokens that trigger a parse error |
| `eofClose` | `boolean` | Allow this node to close at end of input |
| `data` | `T \| () => T` | Data template (auto-cloned) or factory |
| `mapContent` | `string` | Auto-join text content into this data field |
| `hooks` | `NodeHooks<T>` | Inline hook definitions |

## Error Handling

```ts
import { ParseError } from '@prostojs/parser'

try {
  parse(root, source)
} catch (e) {
  if (e instanceof ParseError) {
    console.log(e.message) // includes line, column, and context
  }
}
```

Throws on unclosed nodes and bad tokens with precise source positions.

## Examples

Each example is a standalone parser showcasing different aspects of the API. All source is in the [examples/](https://github.com/prostojs/parser/tree/main/examples) directory on GitHub.

| Example | What it parses | Highlights |
|---------|---------------|------------|
| [**XML-to-JSON**](https://github.com/prostojs/parser/tree/main/examples/xml-json) | Full XML → JSON (fast-xml-parser compatible) | Dynamic end tokens, hooks-based output, entity decoding, ~400 lines |
| [**JSON**](https://github.com/prostojs/parser/tree/main/examples/json) | JSON strings → JS values | `onContent` for bare primitives, state tracking for key/value disambiguation |
| [**Math Evaluator**](https://github.com/prostojs/parser/tree/main/examples/math-eval) | `2 + 3 * (4 - 1)` → `11` | Recursive `group` nodes, result computed during parsing — no AST |
| [**Template String**](https://github.com/prostojs/parser/tree/main/examples/template-string) | `Hello, {{name}}!` → parts array | Minimal 2-node parser, `mapContent` for zero-hook data capture |
| [**CSS Selector**](https://github.com/prostojs/parser/tree/main/examples/css-selector) | `div.cls > span:hover` → structured parts | Dynamic quote matching, regex tokenization in `onContent` |
| [**URL Parser**](https://github.com/prostojs/parser/tree/main/examples/url-parser) | URLs → protocol/host/path/query/hash | Named group auto-mapping, `eject` for boundary detection |
| [**ESM Analyzer**](https://github.com/prostojs/parser/tree/main/examples/esm-analyzer) | JS/TS source → imports, exports, unused | String/comment nodes as "shields" against false positives |

## Migration from v0.5

See [MIGRATION.md](https://github.com/prostojs/parser/blob/main/MIGRATION.md) for a comprehensive guide.

## License

MIT
