import { Node, parse, textContent } from '@prostojs/parser'
import type { ParsedNode } from '@prostojs/parser'

// ─── Options ───

export interface XmlJsonOptions {
    /** Prefix for attribute names in output (default: `"@_"`) */
    attributeNamePrefix?: string
    /** Property name for text content (default: `"#text"`) */
    textNodeName?: string
    /** Property name for CDATA sections. `false` = merge into text (default: `false`) */
    cdataPropName?: string | false
    /** Property name for comments. `false` = discard (default: `false`) */
    commentPropName?: string | false
    /** Ignore all attributes (default: `false`) */
    ignoreAttributes?: boolean
    /** Remove namespace prefix from tag and attribute names (default: `false`) */
    removeNSPrefix?: boolean
    /** Ignore XML declaration (default: `false`) */
    ignoreDeclaration?: boolean
    /** Ignore processing instructions (default: `false`) */
    ignorePiTags?: boolean
    /** Parse tag text values as numbers/booleans (default: `true`) */
    parseTagValue?: boolean
    /** Parse attribute values as numbers/booleans (default: `false`) */
    parseAttributeValue?: boolean
    /** Trim whitespace from text values (default: `true`) */
    trimValues?: boolean
    /** Determine which tags should always be arrays */
    isArray?: (tagName: string, parentTagName: string | undefined) => boolean
    /** Transform tag names */
    transformTagName?: (tagName: string) => string
    /** Transform attribute names (before prefix) */
    transformAttributeName?: (attrName: string) => string
    /** Tags that are self-closing without explicit `/` (like HTML `<br>`, `<img>`) */
    unpairedTags?: string[]
    /** Stop parsing inside these tags — treat inner content as raw text */
    stopNodes?: string[]
    /** Always create text node object, even for leaf text (default: `false`) */
    alwaysCreateTextNode?: boolean
}

const defaults: Required<XmlJsonOptions> = {
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    cdataPropName: false as any,
    commentPropName: false as any,
    ignoreAttributes: false,
    removeNSPrefix: false,
    ignoreDeclaration: false,
    ignorePiTags: false,
    parseTagValue: true,
    parseAttributeValue: false,
    trimValues: true,
    isArray: () => false,
    transformTagName: (n: string) => n,
    transformAttributeName: (n: string) => n,
    unpairedTags: [],
    stopNodes: [],
    alwaysCreateTextNode: false,
}

// ─── Entity decoding ───

const defaultEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
}

function decodeEntities(text: string): string {
    return text.replace(
        /&(?:#x([0-9a-fA-F]+)|#([0-9]+)|(\w+));/g,
        (m, hex, dec, named) => {
            if (hex) return String.fromCodePoint(Number.parseInt(hex, 16))
            if (dec) return String.fromCodePoint(Number.parseInt(dec, 10))
            return defaultEntities[`&${named};`] ?? m
        },
    )
}

function parseValue(text: string): string | number | boolean {
    if (text === 'true') return true
    if (text === 'false') return false
    if (text === '') return text
    const n = Number(text)
    if (!Number.isNaN(n) && text.trim() !== '') return n
    return text
}

// ─── Parser factory ───

export function createXmlJsonParser(userOpts?: XmlJsonOptions) {
    const o = { ...defaults, ...userOpts }
    const unpairedSet = new Set(o.unpairedTags)
    const stopSet = new Set(o.stopNodes)

    // Helpers bound to options
    function stripNs(name: string): string {
        if (!o.removeNSPrefix) return name
        const i = name.indexOf(':')
        return i >= 0 ? name.substring(i + 1) : name
    }

    function tagName(name: string): string {
        return o.transformTagName(stripNs(name))
    }

    function attrName(name: string): string {
        return o.attributeNamePrefix + o.transformAttributeName(stripNs(name))
    }

    function processAttrValue(text: string): string | number | boolean {
        const t = decodeEntities(text)
        return o.parseAttributeValue ? parseValue(t) : t
    }

    function addToObj(
        obj: Record<string, any>,
        key: string,
        value: any,
        parentName: string | undefined,
    ) {
        if (key in obj) {
            if (!Array.isArray(obj[key])) {
                obj[key] = [obj[key]]
            }
            obj[key].push(value)
        } else if (o.isArray(key, parentName)) {
            obj[key] = [value]
        } else {
            obj[key] = value
        }
    }

    // ─── Node definitions ───

    // Attribute value: ="value" or ='value'
    const attrValue = new Node<{ quote: string }>({
        name: 'attr-value',
        start: { token: /=\s*(?<quote>["'])/, omit: true },
        end: { token: (ctx) => ctx.node.data.quote || '"', omit: true },
        data: { quote: '' },
    })

    // Attribute: name="value"
    const attr = new Node<{ key: string; value: string }>({
        name: 'attribute',
        start: { token: /[a-zA-Z_][\w.\-:]*/, omit: false },
        end: { token: /(?:\s(?!\s*=))|[/>?]/, eject: true },
        recognizes: [attrValue],
        data: { key: '', value: '' },
    })
        .onOpen((node, match) => {
            if (match) node.data.key = match.text
        })
        .onClose((node) => {
            for (const item of node.content) {
                if (typeof item !== 'string' && item.node === attrValue) {
                    node.data.value = textContent(item)
                }
            }
        })

    // XML declaration
    const xmlDecl = new Node<{ attrs: Record<string, string> }>({
        name: 'xml-declaration',
        start: { token: /<\?xml\s/, omit: true },
        end: { token: '?>', omit: true },
        recognizes: [attr],
        skip: /\s/,
        data: { attrs: {} },
    }).onClose((node) => {
        for (const item of node.content) {
            if (typeof item !== 'string' && item.node === attr) {
                node.data.attrs[item.data.key] = item.data.value
            }
        }
    })

    // Processing instruction
    const pi = new Node<{ target: string; piContent: string }>({
        name: 'processing-instruction',
        start: { token: /<\?(?<target>[a-zA-Z_][\w.-]*)/, omit: true },
        end: { token: '?>', omit: true },
        data: { target: '', piContent: '' },
        mapContent: 'piContent',
    }).onClose((node) => {
        node.data.piContent = node.data.piContent.trim()
    })

    const doctypeSubset = new Node({ name: 'dtd-subset', start: '[', end: ']' })

    const doctype = new Node<{ doctype: string }>({
        name: 'DOCTYPE',
        start: { token: /<!DOCTYPE\s/i, omit: true },
        end: { token: '>', omit: true },
        recognizes: [doctypeSubset],
        data: { doctype: '' },
    }).onClose((node) => {
        const parts: string[] = []
        for (const item of node.content) {
            if (typeof item === 'string') parts.push(item)
            else if (item.node === doctypeSubset) {
                parts.push('[')
                for (const sub of item.content) {
                    if (typeof sub === 'string') parts.push(sub)
                }
                parts.push(']')
            }
        }
        node.data.doctype = parts.join('').trim()
    })

    // Comment — mapContent auto-collects text
    const comment = new Node<{ text: string }>({
        name: 'comment',
        start: { token: '<!--', omit: true },
        end: { token: '-->', omit: true },
        data: { text: '' },
        mapContent: 'text',
    })

    // CDATA — mapContent auto-collects text
    const cdataNode = new Node<{ text: string }>({
        name: 'CDATA',
        start: { token: '<![CDATA[', omit: true },
        end: { token: ']]>', omit: true },
        data: { text: '' },
        mapContent: 'text',
    })

    // Stop-node: captures everything as raw text until closing tag
    const stopContent = new Node<{ raw: string }>({
        name: 'stop-content',
        start: { token: '>', omit: true },
        end: {
            token: (ctx) => {
                const parentTag = (ctx.parent as ParsedNode | undefined)?.data?.tag
                return parentTag ? `</${parentTag}>` : '</'
            },
            eject: true,
        },
        data: { raw: '' },
        mapContent: 'raw',
    })

    // Inner content — builds JSON directly via hooks (no post-parse tree walk)
    const inner = new Node({
        name: 'inner',
        start: { token: '>', omit: true },
        end: { token: '</', eject: true },
    })
        .onContent((text, node) => {
            const tagData = node.parent?.data
            if (tagData) {
                const decoded = decodeEntities(text)
                const str = o.trimValues ? decoded.trim() : decoded
                if (str) tagData.textParts.push(str)
            }
            return '' // don't store — already routed to parent tag
        })
    inner.recognize(comment, cdataNode)

    // Element tag — output is built incrementally via hooks
    const tag = new Node<{
        tag: string
        endTag: string
        selfClosing: boolean
        output: any
        textParts: string[]
        hasChildren: boolean
    }>({
        name: 'tag',
        start: { token: /<(?<tag>[a-zA-Z_][\w.\-:]*)/, omit: true },
        end: { token: /(?:\/>|<\/(?<endTag>[a-zA-Z_][\w.\-:]*)\s*>)/, omit: true },
        recognizes: [attr],
        skip: /\s/,
        data: { tag: '', endTag: '', selfClosing: false, output: {}, textParts: [], hasChildren: false },
    })
        .onChild((child, node) => {
            // Attributes → add directly to output
            if (child.node === attr && !o.ignoreAttributes) {
                node.data.output[attrName(child.data.key)] = processAttrValue(child.data.value)
            }
            // Stop-node raw content
            else if (child.node === stopContent) {
                node.data.output[o.textNodeName] = child.data.raw
            }
        })
        .onClose((node) => {
            if (!node.data.endTag && !node.data.selfClosing) {
                node.data.selfClosing = true
            }
            if (node.data.endTag && node.data.tag !== node.data.endTag) {
                throw new Error(
                    `Mismatched tags: <${node.data.tag}> and </${node.data.endTag}> at ${node.start.line}:${node.start.column}`,
                )
            }

            // Self-closing or unpaired
            if (node.data.selfClosing || unpairedSet.has(tagName(node.data.tag))) {
                if (o.alwaysCreateTextNode) {
                    node.data.output[o.textNodeName] = ''
                } else if (Object.keys(node.data.output).length === 0) {
                    node.data.output = ''
                }
                return
            }

            // Stop node — already handled by onChild
            if (stopSet.has(tagName(node.data.tag))) return

            // Finalize text content
            const { textParts, hasChildren } = node.data
            if (textParts.length > 0) {
                const joined = textParts.join('')
                const value = o.parseTagValue ? parseValue(joined) : joined
                if (hasChildren || o.alwaysCreateTextNode) {
                    node.data.output[o.textNodeName] = value
                } else if (Object.keys(node.data.output).length === 0) {
                    node.data.output = value // text-only, no attrs → primitive
                } else {
                    node.data.output[o.textNodeName] = value
                }
            } else if (!hasChildren && Object.keys(node.data.output).length === 0) {
                node.data.output = o.alwaysCreateTextNode ? { [o.textNodeName]: '' } : ''
            }
        })

    const _isUnpaired = (name: string) => unpairedSet.has(tagName(name))

    // Wire inner to recognize child tags, and route children to parent tag's output
    inner.recognize(tag)
    inner.onChild((child, innerNode) => {
        const tagData = innerNode.parent?.data
        if (!tagData) return
        const tName = tagName(tagData.tag)

        if (child.node === tag) {
            tagData.hasChildren = true
            addToObj(tagData.output, tagName(child.data.tag), child.data.output, tName)
        } else if (child.node === comment) {
            if (o.commentPropName) {
                addToObj(tagData.output, o.commentPropName, child.data.text, tName)
            }
        } else if (child.node === cdataNode) {
            if (o.cdataPropName) {
                addToObj(tagData.output, o.cdataPropName, child.data.text, tName)
            } else {
                tagData.textParts.push(child.data.text)
            }
        }
    })

    if (stopSet.size > 0) {
        tag.recognize(stopContent, inner)
    } else {
        tag.recognize(inner)
    }

    const root = new Node({
        name: 'document',
        eofClose: true,
        recognizes: [xmlDecl, pi, doctype, comment, tag],
    })

    // ─── Main parse function ───

    return function parseSource(source: string): Record<string, any> {
        const result = parse(root, source)
        const out: Record<string, any> = {}

        let rootText = ''
        for (const item of result.content) {
            if (typeof item === 'string') {
                rootText += item
                continue
            }

            if (item.node === xmlDecl) {
                if (!o.ignoreDeclaration) {
                    const declObj: Record<string, any> = {}
                    for (const [k, v] of Object.entries(item.data.attrs as Record<string, string>)) {
                        declObj[k] = o.parseAttributeValue ? parseValue(v) : v
                    }
                    out['?xml'] = declObj
                }
            } else if (item.node === pi) {
                if (!o.ignorePiTags) {
                    const piKey = `?${tagName(item.data.target)}`
                    addToObj(out, piKey, item.data.piContent, undefined)
                }
            } else if (item.node === doctype) {
                out['!DOCTYPE'] = item.data.doctype
            } else if (item.node === comment) {
                if (o.commentPropName) {
                    addToObj(out, o.commentPropName, item.data.text, undefined)
                }
            } else if (item.node === tag) {
                // Output already built by hooks — use directly
                const tName = tagName(item.data.tag)
                addToObj(out, tName, item.data.output, undefined)
            }
        }

        // Add accumulated root text
        if (rootText) {
            const decoded = decodeEntities(rootText)
            const trimmed = o.trimValues ? decoded.trim() : decoded
            if (trimmed !== '') {
                out[o.textNodeName] = o.parseTagValue ? parseValue(trimmed) : trimmed
            }
        }

        return out
    }
}

/** Convenience: parse XML to JSON with default options */
export function parseXmlJson(source: string, options?: XmlJsonOptions): Record<string, any> {
    return createXmlJsonParser(options)(source)
}
