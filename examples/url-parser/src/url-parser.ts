import { Node, parse, textContent } from '@prostojs/parser'

/**
 * URL Parser built with @prostojs/parser.
 *
 * Parses URLs into structured objects with protocol, auth, host, port,
 * path, query parameters, and hash fragment.
 */

export interface ParsedUrl {
    protocol?: string
    username?: string
    password?: string
    host?: string
    port?: string
    path: string
    query: Record<string, string>
    hash?: string
}

// --- Query parameter node ---
// Matches key=value pairs within the query string.
// Start regex captures the key (everything up to '='), omitting the match from content.
// End ejects on '&' or '#' so the delimiter is not consumed.
const queryParam = new Node<{ key: string; value: string }>({
    name: 'queryParam',
    start: { token: /(?<key>[^=&#]+)=/, omit: true },
    end: [
        { token: '&', omit: true },
        { token: '#', eject: true },
    ],
    eofClose: true,
    data: { key: '', value: '' },
    mapContent: 'value',
})

// --- Query node ---
// Starts at '?', ends at '#' (ejecting so hash node can pick it up) or EOF.
const query = new Node<{ params: Record<string, string> }>({
    name: 'query',
    start: { token: '?', omit: true },
    end: { token: '#', eject: true },
    eofClose: true,
    recognizes: [queryParam],
    data: { params: {} },
})
    .onChild((child, node) => {
        if (child.node === queryParam) {
            node.data.params[child.data.key] = child.data.value
        }
    })

// --- Hash node ---
// Starts at '#', runs to EOF. All content maps to 'value'.
const hash = new Node<{ value: string }>({
    name: 'hash',
    start: { token: '#', omit: true },
    eofClose: true,
    data: { value: '' },
    mapContent: 'value',
})

// --- Root node ---
const root = new Node<{ result: ParsedUrl }>({
    name: 'url',
    eofClose: true,
    recognizes: [query, hash],
    data: () => ({
        result: {
            path: '',
            query: {},
        },
    }),
})
    .onChild((child, node) => {
        if (child.node === query) {
            node.data.result.query = child.data.params
        } else if (child.node === hash) {
            node.data.result.hash = child.data.value
        }
    })
    .onClose((node) => {
        // The text content before any query/hash contains:
        // [protocol://][user[:pass]@]host[:port][/path]
        const prefix = textContent(node)
        parsePrefix(prefix, node.data.result)
    })

/**
 * Parse the URL prefix (everything before ? and #) into structured fields.
 */
function parsePrefix(prefix: string, result: ParsedUrl): void {
    let rest = prefix

    // Extract protocol
    const protoMatch = rest.match(/^([a-z][a-z0-9+.-]*):\/\//i)
    if (protoMatch) {
        result.protocol = protoMatch[1].toLowerCase()
        rest = rest.substring(protoMatch[0].length)
    }

    // Extract auth (everything before the last '@' in the authority)
    const atIndex = rest.indexOf('@')
    if (atIndex !== -1) {
        const authPart = rest.substring(0, atIndex)
        const colonIndex = authPart.indexOf(':')
        if (colonIndex !== -1) {
            result.username = authPart.substring(0, colonIndex)
            result.password = authPart.substring(colonIndex + 1)
        } else {
            result.username = authPart
        }
        rest = rest.substring(atIndex + 1)
    }

    // Split host[:port] from path
    const slashIndex = rest.indexOf('/')
    let authority: string
    if (slashIndex !== -1) {
        authority = rest.substring(0, slashIndex)
        result.path = rest.substring(slashIndex)
    } else {
        authority = rest
        result.path = '/'
    }

    // Extract host and port from authority
    if (authority) {
        const portMatch = authority.match(/:(\d+)$/)
        if (portMatch) {
            result.port = portMatch[1]
            result.host = authority.substring(0, authority.length - portMatch[0].length)
        } else {
            result.host = authority
        }
    }
}

// --- Public API ---

export function parseUrl(input: string): ParsedUrl {
    const result = parse(root, input)
    return result.data.result
}
