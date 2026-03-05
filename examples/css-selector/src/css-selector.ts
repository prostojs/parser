import { Node, parse, textContent } from '@prostojs/parser'
import type { ParsedNode } from '@prostojs/parser'

/**
 * CSS Selector Parser built with @prostojs/parser.
 *
 * Parses CSS selector strings into an array of structured SelectorPart objects.
 */

export interface SelectorPart {
    tag?: string
    id?: string
    classes: string[]
    attributes: { name: string; op?: string; value?: string }[]
    pseudos: string[]
    combinator?: string // ' ', '>', '+', '~'
}

// --- Quoted string inside attribute selectors ---
const quoted = new Node<{ quote: string }>({
    name: 'quoted',
    start: { token: /(?<quote>["'])/, omit: true },
    end: { token: (ctx) => ctx.node.data.quote || '"', omit: true, backslash: true },
    data: { quote: '' },
})

// --- Attribute selector: [name op "value"] ---
const attrSelector = new Node<{ attr: { name: string; op?: string; value?: string } }>({
    name: 'attrSelector',
    start: { token: '[', omit: true },
    end: { token: ']', omit: true },
    recognizes: [quoted],
    data: () => ({ attr: { name: '', op: undefined, value: undefined } }),
})
    .onClose((node) => {
        // Collect text content (outside quoted children) and quoted value
        let raw = ''
        let quotedValue: string | undefined
        for (const item of node.content) {
            if (typeof item === 'string') {
                raw += item
            } else if (item.node === quoted) {
                quotedValue = textContent(item)
            }
        }

        // Parse the raw text: "name", "name op", or "name op value"
        const match = raw.trim().match(/^([\w-]+)\s*(?:([~|^$*]?=)\s*(.*))?$/)
        if (match) {
            node.data.attr.name = match[1]
            if (match[2]) {
                node.data.attr.op = match[2]
                // Value is either the quoted content or the unquoted remainder
                node.data.attr.value = quotedValue !== undefined ? quotedValue : (match[3] || '').trim()
            }
        }
    })

// --- Root selector node ---
interface SelectorData {
    parts: SelectorPart[]
    current: SelectorPart
}

function newPart(combinator?: string): SelectorPart {
    return {
        classes: [],
        attributes: [],
        pseudos: [],
        combinator,
    }
}

const selector = new Node<SelectorData>({
    name: 'selector',
    eofClose: true,
    recognizes: [attrSelector],
    data: () => ({
        parts: [],
        current: newPart(),
    }),
})
    .onContent((text, node) => {
        // Parse text chunks for tags, classes, IDs, pseudos, and combinators
        parseTextChunk(text, node.data)
        return ''
    })
    .onChild((child, node) => {
        if (child.node === attrSelector) {
            node.data.current.attributes.push(
                (child as ParsedNode<{ attr: { name: string; op?: string; value?: string } }>).data.attr,
            )
        }
    })
    .onClose((node) => {
        // Push the last part if it has any content
        if (hasSelectorContent(node.data.current)) {
            node.data.parts.push(node.data.current)
        }
    })

function hasSelectorContent(part: SelectorPart): boolean {
    return !!(
        part.tag ||
        part.id ||
        part.classes.length > 0 ||
        part.attributes.length > 0 ||
        part.pseudos.length > 0
    )
}

/**
 * Parse a text chunk that may contain tag names, .class, #id, :pseudo,
 * and combinators (>, +, ~, or whitespace).
 */
function parseTextChunk(text: string, data: SelectorData): void {
    // Tokenize the text into meaningful parts
    // We need to handle: tag, .class, #id, :pseudo, combinators
    const re = /([>+~])\s*|(\s+)|(\.[a-zA-Z_][\w-]*)|(#[a-zA-Z_][\w-]*)|(:{1,2}[a-zA-Z_][\w-]*(?:\([^)]*\))?)|([a-zA-Z_*][\w-]*)/g
    let m: RegExpExecArray | null

    while ((m = re.exec(text)) !== null) {
        const [, combinator, space, cls, id, pseudo, tag] = m

        if (combinator) {
            // Explicit combinator: >, +, ~
            if (hasSelectorContent(data.current)) {
                data.parts.push(data.current)
                data.current = newPart(combinator.trim())
            } else {
                data.current.combinator = combinator.trim()
            }
        } else if (space) {
            // Space = descendant combinator (only if current part has content)
            if (hasSelectorContent(data.current)) {
                data.parts.push(data.current)
                data.current = newPart(' ')
            }
        } else if (cls) {
            data.current.classes.push(cls.slice(1))
        } else if (id) {
            data.current.id = id.slice(1)
        } else if (pseudo) {
            // Remove leading colon(s)
            data.current.pseudos.push(pseudo.replace(/^:{1,2}/, ''))
        } else if (tag) {
            data.current.tag = tag
        }
    }
}

// --- Public API ---

export function parseSelector(input: string): SelectorPart[] {
    const result = parse(selector, input)
    return result.data.parts
}
