import { Node, parse, textContent, children } from '@prostojs/parser'
import type { ParsedNode } from '@prostojs/parser'

/**
 * JSON Parser built with @prostojs/parser.
 *
 * Parses JSON strings into JavaScript values. Output is built
 * incrementally via hooks — no post-parse tree walk.
 */

// --- String node ---
const string = new Node<{ value: string }>({
    name: 'string',
    start: { token: '"', omit: true },
    end: { token: '"', omit: true, backslash: true },
    data: { value: '' },
})
    .onClose((node) => {
        node.data.value = processEscapes(textContent(node))
    })

// --- Array node ---
const array = new Node<{ items: any[] }>({
    name: 'array',
    start: { token: '[', omit: true },
    end: { token: ']', omit: true },
    skip: /\s+/,
    data: { items: [] },
})
    .onContent((text, node) => {
        // Parse bare primitives from text between commas
        for (const part of text.split(',')) {
            const trimmed = part.trim()
            if (trimmed) {
                node.data.items.push(parsePrimitive(trimmed))
            }
        }
        return ''
    })
    .onChild((child, node) => {
        node.data.items.push(extractValue(child))
    })

// --- Object node ---
// Recognizes strings as keys. Text between key close and next child
// contains ": value," which we parse via onContent.
const object = new Node<{
    entries: Record<string, any>
    pendingKey: string
    awaitingValue: boolean
}>({
    name: 'object',
    start: { token: '{', omit: true },
    end: { token: '}', omit: true },
    skip: /\s+/,
    data: { entries: {}, pendingKey: '', awaitingValue: false },
})
    .onChild((child, node) => {
        if (child.node === string && !node.data.awaitingValue) {
            // This string is a key
            node.data.pendingKey = child.data.value
            node.data.awaitingValue = true
        } else {
            // This is a value (string, array, or object)
            node.data.entries[node.data.pendingKey] = extractValue(child)
            node.data.pendingKey = ''
            node.data.awaitingValue = false
        }
    })
    .onContent((text, node) => {
        if (node.data.awaitingValue) {
            // Text after key string: ": value," or ": value" or just ":"
            const afterColon = text.replace(/^[^:]*:/, '').trim()
            for (const part of afterColon.split(',')) {
                const trimmed = part.trim()
                if (trimmed) {
                    node.data.entries[node.data.pendingKey] = parsePrimitive(trimmed)
                    node.data.pendingKey = ''
                    node.data.awaitingValue = false
                }
            }
        }
        return ''
    })

// Wire up recognizes
const valueNodes = [string, array, object]
array.recognizes = valueNodes
object.recognizes = valueNodes

// --- Root ---
const root = new Node({
    name: 'root',
    eofClose: true,
    recognizes: valueNodes,
    skip: /\s/,
})

// --- Public API ---

export function parseJson(source: string): any {
    const result = parse(root, source)
    const kids = children(result)
    if (kids.length === 1) {
        return extractValue(kids[0])
    }
    // Bare primitive at root level
    const text = textContent(result).trim()
    if (text) return parsePrimitive(text)
    return undefined
}

// --- Helpers ---

function extractValue(node: ParsedNode): any {
    if (node.node === string) return node.data.value
    if (node.node === array) return node.data.items
    if (node.node === object) return node.data.entries
    return textContent(node).trim()
}

function parsePrimitive(text: string): any {
    if (text === 'null') return null
    if (text === 'true') return true
    if (text === 'false') return false
    const num = Number(text)
    if (!isNaN(num) && text !== '') return num
    return text
}

function processEscapes(str: string): string {
    return str.replace(/\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, (_, esc: string) => {
        switch (esc[0]) {
            case '"': return '"'
            case '\\': return '\\'
            case '/': return '/'
            case 'b': return '\b'
            case 'f': return '\f'
            case 'n': return '\n'
            case 'r': return '\r'
            case 't': return '\t'
            case 'u': return String.fromCharCode(parseInt(esc.slice(1), 16))
            default: return esc
        }
    })
}
