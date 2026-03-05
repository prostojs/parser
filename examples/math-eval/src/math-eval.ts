import { Node, parse } from '@prostojs/parser'

/**
 * Math Expression Evaluator built with @prostojs/parser.
 *
 * Computes results during parsing via hooks — no AST is built.
 * Supports +, -, *, /, parentheses, decimals, and negative numbers.
 */

// --- Group node for parenthesized expressions: (...) ---
const group = new Node<{ result: number; segments: string[] }>({
    name: 'group',
    start: { token: '(', omit: true },
    end: { token: ')', omit: true },
    data: { result: 0, segments: [] },
})
    .onContent((text, node) => {
        // Accumulate text segments (operators and numbers between child groups)
        node.data.segments.push(text)
        return ''
    })
    .onChild((child, node) => {
        // A child group has been evaluated; insert its result as text
        // so the parent can treat it like a number in its expression
        node.data.segments.push(String((child.data as { result: number }).result))
    })
    .onClose((node) => {
        const expr = node.data.segments.join('')
        node.data.result = evaluateExpr(expr)
    })

// Group recognizes itself for nested parentheses
group.recognizes = [group]

// --- Root node: the entire expression ---
const root = new Node<{ result: number; segments: string[] }>({
    name: 'expr',
    eofClose: true,
    recognizes: [group],
    data: { result: 0, segments: [] },
})
    .onContent((text, node) => {
        node.data.segments.push(text)
        return ''
    })
    .onChild((child, node) => {
        node.data.segments.push(String((child.data as { result: number }).result))
    })
    .onClose((node) => {
        const expr = node.data.segments.join('')
        node.data.result = evaluateExpr(expr)
    })

// --- Expression evaluator respecting operator precedence ---

/**
 * Evaluate a flat math expression string (no parentheses).
 * Handles operator precedence: * and / before + and -.
 */
function evaluateExpr(expr: string): number {
    // Split into additive terms, preserving the operator.
    // We split on + and - that act as operators (not part of a number).
    // Strategy: tokenize into numbers and operators first.
    const tokens = tokenize(expr.trim())

    if (tokens.length === 0) return 0

    // First pass: evaluate * and / (higher precedence)
    const reduced: (number | string)[] = [parseFloat(tokens[0])]
    for (let i = 1; i < tokens.length; i += 2) {
        const op = tokens[i]
        const right = parseFloat(tokens[i + 1])
        if (op === '*' || op === '/') {
            const left = reduced.pop() as number
            reduced.push(op === '*' ? left * right : left / right)
        } else {
            reduced.push(op, right)
        }
    }

    // Second pass: evaluate + and - (lower precedence)
    let result = reduced[0] as number
    for (let i = 1; i < reduced.length; i += 2) {
        const op = reduced[i] as string
        const right = reduced[i + 1] as number
        if (op === '+') result += right
        else if (op === '-') result -= right
    }

    return result
}

/**
 * Tokenize a flat expression into alternating [number, operator, number, ...].
 * Handles negative numbers at the start or after an operator.
 */
function tokenize(expr: string): string[] {
    const tokens: string[] = []
    let i = 0

    while (i < expr.length) {
        // Skip whitespace
        while (i < expr.length && expr[i] === ' ') i++
        if (i >= expr.length) break

        const ch = expr[i]

        // A +/- is a sign (part of number) if it's the first token or follows an operator
        if ((ch === '-' || ch === '+') && (tokens.length === 0 || isOperator(tokens[tokens.length - 1]))) {
            // It's a sign prefix — read the number including the sign
            let num = ch
            i++
            while (i < expr.length && (isDigitOrDot(expr[i]) || expr[i] === ' ')) {
                if (expr[i] !== ' ') num += expr[i]
                i++
            }
            tokens.push(num)
        } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
            tokens.push(ch)
            i++
        } else {
            // Read a number
            let num = ''
            while (i < expr.length && isDigitOrDot(expr[i])) {
                num += expr[i]
                i++
            }
            if (num) tokens.push(num)
        }
    }

    return tokens
}

function isDigitOrDot(ch: string): boolean {
    return (ch >= '0' && ch <= '9') || ch === '.'
}

function isOperator(token: string): boolean {
    return token === '+' || token === '-' || token === '*' || token === '/'
}

// --- Public API ---

export function evaluate(expr: string): number {
    const result = parse(root, expr)
    return result.data.result
}
