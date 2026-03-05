# URL Parser Example

A URL parser built with `@prostojs/parser`. Parses URLs into structured objects with protocol, auth, host, port, path, query parameters, and hash fragment.

## Usage

```ts
import { parseUrl } from './src/url-parser'

parseUrl('https://user:pass@example.com:8080/api/data?q=hello&page=2#results')
// {
//   protocol: 'https',
//   username: 'user',
//   password: 'pass',
//   host: 'example.com',
//   port: '8080',
//   path: '/api/data',
//   query: { q: 'hello', page: '2' },
//   hash: 'results'
// }

parseUrl('/api/search?q=test')
// { path: '/api/search', query: { q: 'test' } }
```

## How It Works

| Node | Start | End | Purpose |
|------|-------|-----|---------|
| `queryParam` | `key=` (regex with named group) | `&` or `#` (eject) or EOF | Captures key via named group, value via `mapContent` |
| `query` | `?` | `#` (eject) or EOF | Collects query params via `onChild` |
| `hash` | `#` | EOF | Captures fragment via `mapContent` |
| `root` | (none) | EOF | `onClose` parses the prefix text (protocol/auth/host/port/path) |

### Key Design Decisions

- **Named group auto-mapping**: The `queryParam` start token `/(?<key>[^=&#]+)=/` uses a named group `key` that auto-maps to `data.key`. No hook needed to capture the parameter name.
- **Eject for boundaries**: The `query` node ejects on `#` so the hash node can pick it up. Similarly, `queryParam` ejects on `#` to let the query node close.
- **Prefix parsing**: Everything before `?` and `#` is plain text content on the root node. The `onClose` hook regex-parses protocol, auth, host, port, and path from this text.

## Architecture

```
root (eofClose)
 ├── recognizes: query, hash
 │
 query
 │ └── recognizes: queryParam
 │
 hash (mapContent → value)
```

This example showcases how `eject` enables sequential boundary detection — each delimiter (`?`, `#`, `&`) routes control to the right node without consuming characters that belong to the next section.
