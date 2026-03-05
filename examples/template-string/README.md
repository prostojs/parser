# Template String Parser Example

A mustache-style template parser built with `@prostojs/parser`. Extracts `{{expression}}` interpolations from text, returning an array of string literals and expression objects.

## Usage

```ts
import { parseTemplate } from './src/template-string'

parseTemplate('Hello, {{name}}!')
// ['Hello, ', { expr: 'name' }, '!']

parseTemplate('{{greeting}}, {{name}}!')
// [{ expr: 'greeting' }, ', ', { expr: 'name' }, '!']

parseTemplate('No expressions here')
// ['No expressions here']
```

## How It Works

Just two nodes — one of the simplest possible parsers:

| Node | Start | End | Purpose |
|------|-------|-----|---------|
| `expression` | `{{` | `}}` | Captures the expression text via `mapContent` |
| `root` | (none) | EOF | Collects literals and expressions into `data.parts` |

- `root.onContent` pushes string literals to `parts`
- `root.onChild` pushes `{ expr }` objects to `parts`
- `expression` uses `mapContent: 'expr'` to auto-capture inner text — no hooks needed

## Architecture

```
root (eofClose)
 └── recognizes: expression
```

This example demonstrates how `mapContent` eliminates boilerplate — the expression node needs zero hooks to capture its content into a typed data field.
