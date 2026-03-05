# ESM Import/Export Analyzer Example

An ESM module analyzer built with `@prostojs/parser`. Parses JavaScript/TypeScript source to extract imports, exports, and track which imported identifiers are actually used.

## Usage

```ts
import { analyzeModule } from './src/esm-analyzer'

const analysis = analyzeModule(`
import { readFile, writeFile } from 'fs'
import type { Stats } from 'fs'
import 'dotenv/config'

export function load(path: string) {
    return readFile(path, 'utf-8')
}
`)

analysis.imports
// [
//   { source: 'fs', names: ['readFile', 'writeFile'], ... },
//   { source: 'fs', names: ['Stats'], typeOnly: true, ... },
//   { source: 'dotenv/config', sideEffect: true, ... }
// ]

analysis.exports
// { names: ['load'], default: false, reExports: [] }

analysis.usedImports    // ['readFile']
analysis.unusedImports  // ['writeFile']
```

## Supported Patterns

**Imports:**
- Named: `import { a, b } from 'mod'`
- Default: `import Foo from 'mod'`
- Namespace: `import * as ns from 'mod'`
- Aliased: `import { a as b } from 'mod'`
- Side-effect: `import 'mod'`
- Type-only: `import type { T } from 'mod'`

**Exports:**
- Named: `export { a, b }`
- Default: `export default ...`
- Declarations: `export const/let/var/function/class/type/interface ...`
- Re-exports: `export { a } from 'mod'`

**Usage tracking:**
- Scans code text for imported identifiers (word boundary match)
- Correctly ignores identifiers inside strings, template literals, and comments

## How It Works

| Node | Start | End | Purpose |
|------|-------|-----|---------|
| `singleString` | `'` | `'` | Skip single-quoted string content |
| `doubleString` | `"` | `"` | Skip double-quoted string content |
| `templateString` | `` ` `` | `` ` `` | Skip template literal content |
| `lineComment` | `//` | `\n` | Skip line comments |
| `blockComment` | `/*` | `*/` | Skip block comments |
| `importStatement` | `import ` | `\n` or `;` | Capture import statement text |
| `exportStatement` | `export ` | `\n` or `;` | Capture export statement text |

### Key Design Decisions

- **Strings and comments as shields**: The root node recognizes string/comment nodes *before* import/export nodes. This means `"export default x"` inside a string is consumed by the string node — the export node never sees it.
- **Usage scanning on code text only**: `extractCodeText` collects only the bare text content from the root node, excluding all child nodes (strings, comments, imports, exports). Identifier mentions inside strings or comments are never counted.
- **Post-parse regex processing**: Import/export nodes capture raw text via `mapContent`, then regex patterns extract the structured information. This is simpler than trying to model the full import/export syntax with parser nodes.

## Architecture

```
root (eofClose)
 ├── recognizes: lineComment, blockComment
 ├── recognizes: singleString, doubleString, templateString
 └── recognizes: importStatement, exportStatement
      importStatement → recognizes: singleString, doubleString
      exportStatement → recognizes: singleString, doubleString
```

The parser separates concerns: the node tree handles tokenization and content isolation, while post-parse regex handles the detailed grammar of import/export statements.
