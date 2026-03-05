# Migration Guide: v0.5 -> v0.6.0

This guide covers all breaking changes when migrating from `@prostojs/parser` v0.5 to v0.6.0.

## Overview

v0.6.0 is a ground-up rewrite focused on simplicity, performance, and a hooks-based architecture. The core concept remains the same — define nodes with start/end tokens and compose them — but the API surface is significantly smaller and more ergonomic.

Key improvements:
- **60% smaller API** — removed hoisting, absorbing, merging, and context mutation
- **Hooks-based data flow** — build output in final format during parsing (no post-parse tree walk)
- **Plain data templates** — `data: { key: '' }` instead of `initCustomData: () => ({ key: '' })`
- **Named group auto-mapping** — regex `(?<name>...)` maps directly to `data.name`
- **`mapContent`** — auto-join text content into a data field
- **Zero dependencies** — `@prostojs/tree` dependency removed

## Node Class

### Before (v0.5)

```ts
import { ProstoParserNode, BasicNode } from '@prostojs/parser'

// Low-level
const node = new ProstoParserNode<{ tag: string }>({
  label: 'tag',
  icon: '<>',
  startsWith: { token: /<(?<tag>\w+)/, omit: true },
  endsWith: { token: '>', omit: true },
  initCustomData: () => ({ tag: '' }),
})

// Convenience wrapper
const basic = new BasicNode<{ quote: string }>({
  label: 'string',
  icon: '"',
  tokens: [/(?<quote>["'])/, (ctx) => ctx.getCustomData().quote],
  tokenOE: 'omit-omit',
  backSlash: '-ignore',
})
```

### After (v0.6)

```ts
import { Node } from '@prostojs/parser'

const node = new Node<{ tag: string }>({
  name: 'tag',
  start: { token: /<(?<tag>\w+)/, omit: true },
  end: { token: '>', omit: true },
  data: { tag: '' },
})

const str = new Node<{ quote: string }>({
  name: 'string',
  start: { token: /(?<quote>["'])/, omit: true },
  end: { token: (ctx) => ctx.node.data.quote, omit: true },
  data: { quote: '' },
})
```

## Renamed / Changed Options

| v0.5 | v0.6 | Notes |
|------|------|-------|
| `label` / `icon` | `name` | Single string identifier |
| `startsWith` | `start` | `TokenDef` or `TokenDef[]` |
| `endsWith` | `end` | `TokenDef` or `TokenDef[]` |
| `skipToken` | `skip` | Same types |
| `badToken` | `bad` | Same types |
| `initCustomData` | `data` | Plain object (auto-cloned) or `() => T` factory |
| `popsAtEOFSource` | `eofClose` | Boolean |
| `recognizes` | `recognizes` | Unchanged |

## Token Descriptors

### Before (v0.5)

```ts
// BasicNode shortcut
tokens: ['<!--', '-->']
tokenOE: 'omit-omit'
backSlash: '-ignore'

// ProstoParserNode
startsWith: {
  token: '<!--',
  omit: true,
  ignoreBackSlashed: true,
}
```

### After (v0.6)

```ts
// Separate start/end with inline options
start: { token: '<!--', omit: true },
end: { token: '-->', omit: true },

// Or shorthand (just the token, no modifiers)
start: '<!--',
end: '-->',
```

- `backSlash` / `ignoreBackSlashed` — removed. Handle escaping in your token regex or hooks.
- `tokenOE` shorthand — removed. Use `{ token, omit, eject }` directly.
- `consume` — removed.

## Dynamic End Tokens

### Before (v0.5)

```ts
endsWith: {
  token: (context) => context.getCustomData().quote,
}
```

### After (v0.6)

```ts
end: {
  token: (ctx) => ctx.node.data.quote,
}
```

The context shape changed: instead of a `ProstoParserNodeContext` you get a `MatchContext` with `{ node, parent, source, pos }` where `node` is the `ParsedNode`.

## Custom Data

### Before (v0.5)

```ts
const node = new ProstoParserNode<{ name: string }>({
  initCustomData: () => ({ name: '' }),
})

// Access in callbacks
.onMatch(({ customData }) => {
  console.log(customData.name)
})
```

### After (v0.6)

```ts
const node = new Node<{ name: string }>({
  data: { name: '' },  // plain object — auto-cloned per parse
})

// Access in hooks
.onOpen((parsedNode) => {
  console.log(parsedNode.data.name)
})
```

Plain objects are auto-cloned with an optimized cloner (primitive-only objects use spread, objects/arrays get shallow-cloned). You can still pass a factory function if needed: `data: () => ({ name: '' })`.

## Named Group Auto-Mapping

In v0.5, named regex groups were copied to `customData` automatically, but only **after** `onMatch` fired.

In v0.6, named groups are mapped to `data` fields **before** `onOpen` fires, so they are available in the hook:

```ts
const node = new Node<{ tag: string }>({
  name: 'tag',
  start: { token: /<(?<tag>\w+)/ },
  data: { tag: '' },
})
.onOpen((node) => {
  // node.data.tag is already set from the regex group
  console.log(node.data.tag) // works!
})
```

## Hooks (Callbacks)

The callback system was redesigned. Instead of callback-data objects, hooks receive the parsed node directly.

### Before (v0.5)

```ts
node
  .onMatch(({ context, customData, matched }) => { ... })
  .onPop(({ context, customData, parserContext }) => { ... })
  .onAppendContent((text, { context, customData }) => modifiedText)
  .onBeforeChildParse((childContext, { context }) => { ... })
  .onAfterChildParse((childContext, { context }) => { ... })
```

### After (v0.6)

```ts
node
  .onOpen((node, match) => { ... })       // replaces onMatch
  .onClose((node, match) => { ... })      // replaces onPop
  .onContent((text, node) => modifiedText) // replaces onAppendContent
  .onChild((child, node) => { ... })       // replaces onAfterChildParse
```

Key differences:
- `onMatch` -> `onOpen` — receives `(ParsedNode, MatchResult | null)`. Return `false` to reject the match.
- `onPop` -> `onClose` — receives `(ParsedNode, MatchResult | null)`
- `onAppendContent` -> `onContent` — receives `(text, ParsedNode)`, return string or void
- `onBeforeChildParse` — **removed**. Use `onChild` (fires after child is fully parsed)
- `onAfterChildParse` -> `onChild` — receives `(childParsedNode, parentParsedNode)`
- No more `parserContext` access — node data flow is self-contained via hooks

## Parsing

### Before (v0.5)

```ts
const result = rootNode.parse('...source...')
// result is ProstoParserNodeContext
console.log(result.content)
console.log(result.getCustomData())
console.log(result.toTree())
```

### After (v0.6)

```ts
import { parse, printTree } from '@prostojs/parser'

const result = parse(rootNode, '...source...')
// result is ParsedNode
console.log(result.content)
console.log(result.data)
printTree(result) // standalone utility
```

`parse()` is now a standalone function, not a method on the node. This keeps nodes reusable and stateless.

## Removed Features

### Hoisting (`hoistChildren`)

Hoisting allowed pulling child data up to parent `customData`. In v0.6, use `onChild` hooks instead:

```ts
// v0.5
node.addHoistChildren({
  node: childNode,
  as: 'items',
  asArray: true,
  mapRule: 'customData',
})

// v0.6
node.onChild((child, parent) => {
  if (child.node === childNode) {
    parent.data.items.push(child.data)
  }
})
```

### Absorbing (`addAbsorbs`)

Absorbing merged child content into parent. Use `onChild` hooks:

```ts
// v0.5
node.addAbsorbs(childNode, 'join')
node.addAbsorbs([valueNode], 'join->value')

// v0.6
node.onChild((child, parent) => {
  if (child.node === childNode) {
    // join child content into parent
    parent.data.value = textContent(child)
  }
})
```

### Merging / Flattening

Not available in v0.6. Use hooks to build your desired output structure.

### `popsAfterNode` / `addPopsAfterNode`

Removed. If you need a node to close after a specific child, implement the logic in `onChild`:

```ts
// The parser doesn't auto-close nodes after children anymore.
// Structure your tokens so the end token naturally follows.
```

### Context Mutation

In v0.5, you could mutate the node context at runtime:
- `context.clearRecognizes(node)`
- `context.addAbsorbs(node, rule)`
- `context.clearSkipToken()`
- `childContext.endsWith = { ... }`
- `context.removeOnAppendContent()`

None of these are available in v0.6. Nodes are immutable definitions. Use hooks and data fields to control behavior dynamically.

### Tree Visualization

```ts
// v0.5
result.toTree()

// v0.6
import { printTree } from '@prostojs/parser'
printTree(result)
```

## `mapContent`

New in v0.6. Auto-joins all text content into a data field when the node closes:

```ts
const comment = new Node<{ text: string }>({
  name: 'comment',
  start: { token: '<!--', omit: true },
  end: { token: '-->', omit: true },
  data: { text: '' },
  mapContent: 'text',  // text content auto-joined into data.text
})
```

This eliminates common `onClose` boilerplate like:
```ts
.onClose((node) => {
  node.data.text = textContent(node)
})
```

## Utilities

New standalone utilities replace methods that were on context objects:

```ts
import { textContent, children, findChild, findChildren, walk, printTree } from '@prostojs/parser'

// Get joined text content of a node
textContent(parsedNode)

// Get child ParsedNodes (filter out strings)
children(parsedNode)

// Find first/all children matching a node type
findChild(parsedNode, someNode)
findChildren(parsedNode, someNode)

// Walk the tree
walk(parsedNode, (node, depth) => { ... })

// Print tree visualization
printTree(parsedNode)
```

## Error Handling

### Before (v0.5)

```ts
parserContext.panicBlock('message', startOffset, endOffset)
```

### After (v0.6)

The parser throws `ParseError` with source position information:

```ts
import { ParseError } from '@prostojs/parser'

try {
  parse(root, source)
} catch (e) {
  if (e instanceof ParseError) {
    console.log(e.message) // includes line/column info
  }
}
```

## Complete Migration Example

### v0.5 — Simple key-value parser

```ts
import { BasicNode } from '@prostojs/parser'

const root = new BasicNode({ icon: 'ROOT' })
const string = new BasicNode<{ quote: string }>({
  icon: '"',
  tokens: [/(?<quote>["'])/, (ctx) => ctx.getCustomData().quote],
  tokenOE: 'omit-omit',
})
const pair = new BasicNode<{ key: string; value: string }>({
  label: 'pair',
  tokens: [/(?<key>\w+)\s*=\s*/, /\n|$/],
  tokenOE: 'omit-omit',
})
  .addAbsorbs(string, 'join')
  .mapContent('value', 'join-clear')

root.addRecognizes(pair)
pair.addRecognizes(string)

const result = root.parse('name = "Alice"\nage = "30"')
```

### v0.6 — Same parser

```ts
import { Node, parse, textContent } from '@prostojs/parser'

const string = new Node<{ quote: string }>({
  name: 'string',
  start: { token: /(?<quote>["'])/, omit: true },
  end: { token: (ctx) => ctx.node.data.quote, omit: true },
  data: { quote: '' },
})

const pair = new Node<{ key: string; value: string }>({
  name: 'pair',
  start: { token: /(?<key>\w+)\s*=\s*/, omit: true },
  end: { token: /\n|$/, omit: true },
  recognizes: [string],
  data: { key: '', value: '' },
  mapContent: 'value',
})

const root = new Node({
  name: 'root',
  eofClose: true,
  recognizes: [pair],
})

const result = parse(root, 'name = "Alice"\nage = "30"')
```
