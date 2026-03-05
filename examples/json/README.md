# JSON Parser Example

A JSON parser built with `@prostojs/parser`. Parses JSON strings into JavaScript values — output is built incrementally via hooks, no post-parse tree walk.

## Usage

```ts
import { parseJson } from './src/json-parser'

parseJson('{"name": "Alice", "age": 30}')
// { name: 'Alice', age: 30 }

parseJson('[1, true, null, "hello"]')
// [1, true, null, 'hello']

parseJson('42')
// 42
```

## How It Works

Four nodes handle the JSON grammar:

| Node | Start | End | Purpose |
|------|-------|-----|---------|
| `string` | `"` | `"` | String values (with escape processing) |
| `array` | `[` | `]` | Arrays — children for nested values, `onContent` for bare primitives |
| `object` | `{` | `}` | Objects — strings as keys or values, `onContent` for primitive values |
| `root` | (none) | EOF | Top-level wrapper |

### Key Design Decisions

- **Bare primitives** (numbers, booleans, `null`) are not delimited by tokens, so they appear as text content. The `onContent` hook splits text on commas and parses each part.
- **Key/value disambiguation** in objects uses state tracking (`pendingKey` / `awaitingValue`) — when a string child arrives and we're not awaiting a value, it's a key; otherwise it's a value.
- **Escape sequences** (`\n`, `\t`, `\uXXXX`, etc.) are processed in the string node's `onClose` hook.

## Architecture

```
root
 └── recognizes: string, array, object
      array  → recognizes: string, array, object
      object → recognizes: string, array, object
```

Output is assembled during parsing:
- `array.onContent` → split comma-separated text into primitives, push to `data.items`
- `array.onChild` → push child value to `data.items`
- `object.onChild` → alternate between key and value assignment
- `object.onContent` → parse primitive values after `:` for the pending key
