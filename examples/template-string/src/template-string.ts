import { Node, parse } from '@prostojs/parser'

/**
 * Template String Parser built with @prostojs/parser.
 *
 * Parses mustache-style `{{expression}}` interpolations in text,
 * returning an array of string literals and expression objects.
 */

export type TemplatePart = string | { expr: string }

// --- Expression node ---
const expression = new Node<{ expr: string }>({
    name: 'expression',
    start: { token: '{{', omit: true },
    end: { token: '}}', omit: true },
    data: { expr: '' },
    mapContent: 'expr',
})

// --- Root node ---
const root = new Node<{ parts: TemplatePart[] }>({
    name: 'template',
    eofClose: true,
    recognizes: [expression],
    data: { parts: [] },
})
    .onContent((text, node) => {
        if (text) {
            node.data.parts.push(text)
        }
        return ''
    })
    .onChild((child, node) => {
        if (child.node === expression) {
            node.data.parts.push({ expr: child.data.expr })
        }
    })

// --- Public API ---

export function parseTemplate(source: string): TemplatePart[] {
    const result = parse(root, source)
    return result.data.parts
}
