# Math Expression Evaluator Example

A math expression evaluator built with `@prostojs/parser`. Computes results during parsing via hooks — no AST is built.

## Usage

```ts
import { evaluate } from './src/math-eval'

evaluate('2 + 3 * 4')     // 14
evaluate('(2 + 3) * 4')   // 20
evaluate('-5 + 3.14')      // -1.86
evaluate('10 / 3')         // 3.333...
```

## Supported Features

- Basic arithmetic: `+`, `-`, `*`, `/`
- Operator precedence: `*` and `/` before `+` and `-`
- Parentheses for grouping (nested to any depth)
- Decimal numbers
- Negative numbers

## How It Works

Only two nodes are needed:

| Node | Start | End | Purpose |
|------|-------|-----|---------|
| `group` | `(` | `)` | Parenthesized sub-expression |
| `root` | (none) | EOF | Top-level expression |

Both nodes use the same pattern:
1. `onContent` — accumulate text segments (numbers and operators)
2. `onChild` — insert a child group's computed result as a string
3. `onClose` — join segments and evaluate the flat expression

The `evaluateExpr` function handles operator precedence with two passes:
1. First pass: evaluate `*` and `/`
2. Second pass: evaluate `+` and `-`

## Architecture

```
root (eofClose)
 └── recognizes: group
      group → recognizes: group (recursive nesting)
```

Parentheses are resolved bottom-up: the innermost group evaluates first, its result is injected into the parent as a number, and so on until the root computes the final answer.
