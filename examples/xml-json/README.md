# XML-to-JSON Parser Example

A full-featured XML-to-JSON parser built with `@prostojs/parser`. Output format is compatible with `fast-xml-parser`.

Since `@prostojs/parser` is a **general-purpose** parser toolkit (not hand-optimized for XML), it is slightly slower than `fast-xml-parser` — a mature library dedicated exclusively to XML. The trade-off is flexibility: the same toolkit can parse any token-based format.

## Usage

```ts
import { createXmlJsonParser, parseXmlJson } from './src/xml-json'

// Quick parse with default options
const result = parseXmlJson('<root><item>hello</item></root>')
// { root: { item: 'hello' } }

// Reusable parser with custom options
const parse = createXmlJsonParser({
    attributeNamePrefix: '',
    trimValues: false,
    cdataPropName: '__cdata',
})

const doc = parse(`<?xml version="1.0"?>
<library>
    <book id="1"><title>Great Gatsby</title></book>
    <book id="2"><title>Brief History</title></book>
</library>`)
// {
//   '?xml': { version: '1.0' },
//   library: {
//     book: [
//       { id: '1', title: 'Great Gatsby' },
//       { id: '2', title: 'Brief History' }
//     ]
//   }
// }
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `attributeNamePrefix` | `string` | `"@_"` | Prefix for attribute keys in output |
| `textNodeName` | `string` | `"#text"` | Key for text content when mixed with elements |
| `cdataPropName` | `string \| false` | `false` | Key for CDATA sections (`false` = merge into text) |
| `commentPropName` | `string \| false` | `false` | Key for comments (`false` = discard) |
| `ignoreAttributes` | `boolean` | `false` | Ignore all attributes |
| `removeNSPrefix` | `boolean` | `false` | Remove namespace prefixes from tag/attribute names |
| `ignoreDeclaration` | `boolean` | `false` | Ignore `<?xml ...?>` declaration |
| `ignorePiTags` | `boolean` | `false` | Ignore processing instructions |
| `parseTagValue` | `boolean` | `true` | Parse text as numbers/booleans |
| `parseAttributeValue` | `boolean` | `false` | Parse attribute values as numbers/booleans |
| `trimValues` | `boolean` | `true` | Trim whitespace from text values |
| `isArray` | `(tag, parent) => boolean` | `() => false` | Force specific tags to always be arrays |
| `transformTagName` | `(name) => string` | identity | Transform tag names |
| `transformAttributeName` | `(name) => string` | identity | Transform attribute names |
| `unpairedTags` | `string[]` | `[]` | Tags that are self-closing without `/` (like `<br>`) |
| `stopNodes` | `string[]` | `[]` | Tags whose inner content is raw text |
| `alwaysCreateTextNode` | `boolean` | `false` | Always use `{ "#text": ... }` for text content |

## Output Format

- **Text-only elements** become primitives: `<name>Alice</name>` -> `{ name: "Alice" }`
- **Attributes** are prefixed: `<item id="1"/>` -> `{ item: { "@_id": "1" } }`
- **Repeated elements** become arrays: `<item>a</item><item>b</item>` -> `{ item: ["a", "b"] }`
- **Self-closing tags** without attributes become empty strings: `<empty/>` -> `{ empty: "" }`
- **CDATA** merges into text by default, or uses `cdataPropName` key
- **Mixed content** (text + elements) uses `textNodeName` for text portions

## Benchmark Results

Compared against `fast-xml-parser` v5.4.2 on Apple M4, Node.js v24.

| Document | Size | @prostojs/parser | fast-xml-parser | Ratio |
|----------|------|-----------------|-----------------|-------|
| Small (simple note) | 169 chars | 5.62 us | 4.76 us | 1.18x slower |
| Medium (50 books) | 18 KB | 410.63 us | 388.16 us | 1.06x slower |
| Large (200 products, CDATA, comments) | 200 KB | 5.07 ms | 4.85 ms | 1.04x slower |
| Deeply nested (4 levels, 150 leaves) | 32 KB | 851.12 us | 623.93 us | 1.36x slower |

The general-purpose parser is within 4-36% of the dedicated XML parser depending on document structure. The gap narrows on larger, flatter documents and widens on deeply nested ones.

To reproduce these results, see [bench/](../../bench/).

## Architecture

This parser builds JSON output **incrementally during parsing** using hooks — no post-parse tree walk is needed.

Key design:
- `tag.onChild` routes attributes directly to `data.output`
- `inner.onContent` routes text to parent tag's `textParts` array
- `inner.onChild` routes child tags/comments/CDATA to grandparent tag's `output`
- `tag.onClose` finalizes the text content and output format
