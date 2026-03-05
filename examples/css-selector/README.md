# CSS Selector Parser Example

A CSS selector parser built with `@prostojs/parser`. Parses selector strings into structured objects with tags, classes, IDs, attributes, pseudo-selectors, and combinators.

## Usage

```ts
import { parseSelector } from './src/css-selector'

parseSelector('div.container > span.highlight:hover')
// [
//   { tag: 'div', classes: ['container'], attributes: [], pseudos: [] },
//   { combinator: '>', tag: 'span', classes: ['highlight'], attributes: [], pseudos: ['hover'] }
// ]

parseSelector('input[type="text"]')
// [{ tag: 'input', classes: [], attributes: [{ name: 'type', op: '=', value: 'text' }], pseudos: [] }]
```

## Supported Selectors

- Tag names: `div`, `span`, `*`
- Classes: `.className`
- IDs: `#myId`
- Attributes: `[attr]`, `[attr="value"]`, `[attr^="prefix"]`
- Pseudo-selectors: `:hover`, `:first-child`, `::before`
- Combinators: ` ` (descendant), `>` (child), `+` (adjacent), `~` (sibling)

## How It Works

| Node | Start | End | Purpose |
|------|-------|-----|---------|
| `quoted` | `"` or `'` | matching quote | Quoted values inside attribute selectors (dynamic end token) |
| `attrSelector` | `[` | `]` | Attribute selector — `onClose` parses name/op/value |
| `selector` | (none) | EOF | Root — `onContent` tokenizes text for tags/classes/IDs/pseudos/combinators |

### Key Design Decisions

- **Dynamic end token**: The `quoted` node uses a regex named group to capture the opening quote character, then uses a dynamic end token function to match the same quote. This handles both `"..."` and `'...'` with a single node.
- **Text tokenization**: Most of the selector grammar (tags, `.class`, `#id`, `:pseudo`, combinators) lives in plain text. The `onContent` hook uses a regex to tokenize these chunks — only `[...]` attribute selectors need dedicated nodes.
- **Combinator tracking**: Each `SelectorPart` carries an optional `combinator` field indicating how it relates to the previous part.

## Architecture

```
selector (eofClose)
 └── recognizes: attrSelector
      attrSelector → recognizes: quoted
```

The parser uses only 3 nodes because CSS selectors are mostly flat text with occasional structured `[...]` blocks. The heavy lifting happens in `onContent` text parsing.
