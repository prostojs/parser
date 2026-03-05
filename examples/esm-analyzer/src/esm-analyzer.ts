import { Node, parse, textContent } from '@prostojs/parser'
import type { ParsedNode } from '@prostojs/parser'

/**
 * ESM Import/Export Analyzer
 *
 * Parses JavaScript/TypeScript ESM modules (import/export statements)
 * to extract: imported names, exported names, side-effect imports,
 * and which imported names are actually used in the code.
 *
 * This is NOT a full JS parser — it only understands module interface
 * boundaries (imports/exports) and tracks identifier usage.
 */

export interface ImportInfo {
    source: string
    names: string[]           // imported names (local aliases)
    originalNames: string[]   // original names from the module
    default?: string          // default import name
    namespace?: string        // namespace import name (import * as X)
    sideEffect: boolean       // import 'module' with no bindings
    typeOnly: boolean         // import type { ... }
}

export interface ExportInfo {
    names: string[]           // exported names
    default: boolean          // has default export
    reExports: { source: string; names: string[] }[]
}

export interface ModuleAnalysis {
    imports: ImportInfo[]
    exports: ExportInfo
    usedImports: string[]     // imported names that appear in code
    unusedImports: string[]   // imported names that don't appear in code
}

// --- String nodes (to skip string content from identifier scanning) ---
const singleString = new Node({
    name: 'singleString',
    start: { token: "'", omit: true },
    end: { token: "'", omit: true, backslash: true },
})

const doubleString = new Node({
    name: 'doubleString',
    start: { token: '"', omit: true },
    end: { token: '"', omit: true, backslash: true },
})

const templateString = new Node({
    name: 'templateString',
    start: { token: '`', omit: true },
    end: { token: '`', omit: true, backslash: true },
})

// --- Comment nodes (to skip comments from identifier scanning) ---
const lineComment = new Node({
    name: 'lineComment',
    start: { token: '//', omit: true },
    end: { token: /\n/, eject: true },
})

const blockComment = new Node({
    name: 'blockComment',
    start: { token: '/*', omit: true },
    end: { token: '*/', omit: true },
})

// --- Import statement node ---
// Matches: import ... from '...'
// Matches: import '...'  (side-effect)
// Matches: import type { ... } from '...'
const importStatement = new Node<{
    raw: string
}>({
    name: 'import',
    start: { token: /(?:^|\n)\s*import\s/, omit: true },
    end: { token: /\n|;/, eject: true },
    eofClose: true,
    data: { raw: '' },
    mapContent: 'raw',
})

// --- Export statement node ---
const exportStatement = new Node<{
    raw: string
}>({
    name: 'export',
    start: { token: /(?:^|\n)\s*export\s/, omit: true },
    end: { token: /\n|;/, eject: true },
    eofClose: true,
    data: { raw: '' },
    mapContent: 'raw',
})

// Strings inside import/export (for the 'from' source)
importStatement.recognizes = [singleString, doubleString]
exportStatement.recognizes = [singleString, doubleString]

// --- Root ---
const root = new Node({
    name: 'root',
    eofClose: true,
    recognizes: [
        lineComment,
        blockComment,
        singleString,
        doubleString,
        templateString,
        importStatement,
        exportStatement,
    ],
})

// --- Public API ---

export function analyzeModule(source: string): ModuleAnalysis {
    const result = parse(root, source)

    const imports: ImportInfo[] = []
    const exportInfo: ExportInfo = { names: [], default: false, reExports: [] }

    for (const item of result.content) {
        if (typeof item === 'string') continue
        if (item.node === importStatement) {
            const info = parseImportStatement(item)
            if (info) imports.push(info)
        } else if (item.node === exportStatement) {
            parseExportStatement(item, exportInfo)
        }
    }

    // Collect all imported identifiers
    const allImportedNames: string[] = []
    for (const imp of imports) {
        allImportedNames.push(...imp.names)
        if (imp.default) allImportedNames.push(imp.default)
        if (imp.namespace) allImportedNames.push(imp.namespace)
    }

    // Scan the non-import/export text for identifier usage
    const codeText = extractCodeText(result)
    const usedImports: string[] = []
    const unusedImports: string[] = []

    for (const name of allImportedNames) {
        // Check if the identifier appears in code (word boundary match)
        const regex = new RegExp(`\\b${escapeRegex(name)}\\b`)
        if (regex.test(codeText)) {
            usedImports.push(name)
        } else {
            unusedImports.push(name)
        }
    }

    return { imports, exports: exportInfo, usedImports, unusedImports }
}

// --- Internal parsing helpers ---

function parseImportStatement(node: ParsedNode): ImportInfo | null {
    // Reconstruct the full import text including string children
    let raw = ''
    for (const item of node.content) {
        if (typeof item === 'string') {
            raw += item
        } else {
            // Inline the string value with quotes
            raw += `'${textContent(item)}'`
        }
    }
    raw = raw.trim()

    // Side-effect import: import 'module'
    const sideEffectMatch = raw.match(/^(['"])(.+?)\1\s*$/)
    if (sideEffectMatch) {
        return {
            source: sideEffectMatch[2],
            names: [],
            originalNames: [],
            sideEffect: true,
            typeOnly: false,
        }
    }

    // Extract type keyword
    const typeOnly = /^type\s/.test(raw)
    const cleanRaw = raw.replace(/^type\s+/, '')

    // Extract the source module (from '...')
    const fromMatch = cleanRaw.match(/from\s+['"](.+?)['"]/)
    if (!fromMatch) return null
    const source = fromMatch[1]

    // Extract the imports part (before 'from')
    const importsPart = cleanRaw.slice(0, cleanRaw.indexOf('from')).trim()

    const info: ImportInfo = {
        source,
        names: [],
        originalNames: [],
        sideEffect: false,
        typeOnly,
    }

    // Namespace import: * as name
    const nsMatch = importsPart.match(/\*\s+as\s+(\w+)/)
    if (nsMatch) {
        info.namespace = nsMatch[1]
    }

    // Default import: name before { or ,
    const defaultMatch = importsPart.match(/^(\w+)/)
    if (defaultMatch && defaultMatch[1] !== 'type') {
        // Check it's not part of * as or { }
        const beforeBrace = importsPart.split('{')[0].split('*')[0].trim()
        const defName = beforeBrace.replace(/,\s*$/, '').trim()
        if (defName && /^\w+$/.test(defName)) {
            info.default = defName
        }
    }

    // Named imports: { a, b as c, ... }
    const namedMatch = importsPart.match(/\{([^}]*)\}/)
    if (namedMatch) {
        const items = namedMatch[1].split(',').map(s => s.trim()).filter(Boolean)
        for (const item of items) {
            // Skip "type X" in non-type-only imports
            const cleanItem = item.replace(/^type\s+/, '')
            const asMatch = cleanItem.match(/(\w+)\s+as\s+(\w+)/)
            if (asMatch) {
                info.originalNames.push(asMatch[1])
                info.names.push(asMatch[2])
            } else {
                const name = cleanItem.trim()
                if (name) {
                    info.originalNames.push(name)
                    info.names.push(name)
                }
            }
        }
    }

    return info
}

function parseExportStatement(node: ParsedNode, info: ExportInfo): void {
    let raw = ''
    for (const item of node.content) {
        if (typeof item === 'string') {
            raw += item
        } else {
            raw += `'${textContent(item)}'`
        }
    }
    raw = raw.trim()

    // export default
    if (/^default\b/.test(raw)) {
        info.default = true
        return
    }

    // Re-export: export { ... } from '...'
    const reExportMatch = raw.match(/\{([^}]*)\}\s+from\s+['"](.+?)['"]/)
    if (reExportMatch) {
        const names = reExportMatch[1].split(',').map(s => {
            const asMatch = s.trim().match(/(\w+)\s+as\s+(\w+)/)
            return asMatch ? asMatch[2] : s.trim()
        }).filter(Boolean)
        info.reExports.push({ source: reExportMatch[2], names })
        info.names.push(...names)
        return
    }

    // export const/let/var/function/class name
    const declMatch = raw.match(/^(?:const|let|var|function|class|async\s+function)\s+(\w+)/)
    if (declMatch) {
        info.names.push(declMatch[1])
        return
    }

    // export type/interface
    const typeMatch = raw.match(/^(?:type|interface)\s+(\w+)/)
    if (typeMatch) {
        info.names.push(typeMatch[1])
        return
    }

    // export { a, b, c }
    const namedMatch = raw.match(/\{([^}]*)\}/)
    if (namedMatch) {
        const names = namedMatch[1].split(',').map(s => {
            const asMatch = s.trim().match(/(\w+)\s+as\s+(\w+)/)
            return asMatch ? asMatch[2] : s.trim()
        }).filter(Boolean)
        info.names.push(...names)
        return
    }
}

function extractCodeText(result: ParsedNode): string {
    // Collect all text that is NOT inside import/export statements
    let code = ''
    for (const item of result.content) {
        if (typeof item === 'string') {
            code += item
        } else if (item.node !== importStatement && item.node !== exportStatement
            && item.node !== lineComment && item.node !== blockComment) {
            // Include string content — identifiers might be used in template literals etc.
            // Actually, skip strings to avoid false positives
        }
    }
    return code
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
