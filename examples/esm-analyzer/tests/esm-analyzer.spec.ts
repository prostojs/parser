import { describe, it, expect } from 'vitest'
import { analyzeModule } from '../src/esm-analyzer'

describe('ESM Analyzer', () => {
    describe('imports', () => {
        it('should parse named imports', () => {
            const result = analyzeModule(`import { foo, bar } from 'my-lib'`)
            expect(result.imports).toHaveLength(1)
            expect(result.imports[0].source).toBe('my-lib')
            expect(result.imports[0].names).toEqual(['foo', 'bar'])
            expect(result.imports[0].originalNames).toEqual(['foo', 'bar'])
            expect(result.imports[0].sideEffect).toBe(false)
        })

        it('should parse default import', () => {
            const result = analyzeModule(`import React from 'react'`)
            expect(result.imports[0].default).toBe('React')
            expect(result.imports[0].source).toBe('react')
        })

        it('should parse default + named imports', () => {
            const result = analyzeModule(`import React, { useState, useEffect } from 'react'`)
            expect(result.imports[0].default).toBe('React')
            expect(result.imports[0].names).toEqual(['useState', 'useEffect'])
            expect(result.imports[0].source).toBe('react')
        })

        it('should parse namespace import', () => {
            const result = analyzeModule(`import * as path from 'path'`)
            expect(result.imports[0].namespace).toBe('path')
            expect(result.imports[0].source).toBe('path')
        })

        it('should parse aliased imports', () => {
            const result = analyzeModule(`import { foo as bar, baz as qux } from 'my-lib'`)
            expect(result.imports[0].names).toEqual(['bar', 'qux'])
            expect(result.imports[0].originalNames).toEqual(['foo', 'baz'])
        })

        it('should parse side-effect import', () => {
            const result = analyzeModule(`import 'side-effect-lib'`)
            expect(result.imports[0].sideEffect).toBe(true)
            expect(result.imports[0].source).toBe('side-effect-lib')
            expect(result.imports[0].names).toEqual([])
        })

        it('should parse type-only import', () => {
            const result = analyzeModule(`import type { MyType } from './types'`)
            expect(result.imports[0].typeOnly).toBe(true)
            expect(result.imports[0].names).toEqual(['MyType'])
        })

        it('should parse multiple import statements', () => {
            const source = `
import { readFile } from 'fs'
import { join } from 'path'
import 'polyfill'
`
            const result = analyzeModule(source)
            expect(result.imports).toHaveLength(3)
            expect(result.imports[0].source).toBe('fs')
            expect(result.imports[1].source).toBe('path')
            expect(result.imports[2].sideEffect).toBe(true)
        })
    })

    describe('exports', () => {
        it('should parse named exports', () => {
            const result = analyzeModule(`export { foo, bar }`)
            expect(result.exports.names).toContain('foo')
            expect(result.exports.names).toContain('bar')
        })

        it('should parse default export', () => {
            const result = analyzeModule(`export default function main() {}`)
            expect(result.exports.default).toBe(true)
        })

        it('should parse exported declarations', () => {
            const result = analyzeModule(`export const myConst = 42`)
            expect(result.exports.names).toContain('myConst')
        })

        it('should parse export function', () => {
            const result = analyzeModule(`export function hello() {}`)
            expect(result.exports.names).toContain('hello')
        })

        it('should parse export class', () => {
            const result = analyzeModule(`export class MyClass {}`)
            expect(result.exports.names).toContain('MyClass')
        })

        it('should parse export type', () => {
            const result = analyzeModule(`export type MyType = string`)
            expect(result.exports.names).toContain('MyType')
        })

        it('should parse export interface', () => {
            const result = analyzeModule(`export interface MyInterface {}`)
            expect(result.exports.names).toContain('MyInterface')
        })

        it('should parse re-exports', () => {
            const result = analyzeModule(`export { foo, bar } from './other'`)
            expect(result.exports.reExports).toHaveLength(1)
            expect(result.exports.reExports[0].source).toBe('./other')
            expect(result.exports.reExports[0].names).toEqual(['foo', 'bar'])
        })

        it('should parse aliased re-exports', () => {
            const result = analyzeModule(`export { foo as baz } from './other'`)
            expect(result.exports.reExports[0].names).toEqual(['baz'])
        })
    })

    describe('usage tracking', () => {
        it('should detect used imports', () => {
            const source = `
import { useState, useEffect } from 'react'

const [count, setCount] = useState(0)
useEffect(() => {}, [])
`
            const result = analyzeModule(source)
            expect(result.usedImports).toContain('useState')
            expect(result.usedImports).toContain('useEffect')
            expect(result.unusedImports).toEqual([])
        })

        it('should detect unused imports', () => {
            const source = `
import { foo, bar, baz } from 'my-lib'

console.log(foo)
`
            const result = analyzeModule(source)
            expect(result.usedImports).toContain('foo')
            expect(result.unusedImports).toContain('bar')
            expect(result.unusedImports).toContain('baz')
        })

        it('should not count identifiers inside comments as usage', () => {
            const source = `
import { unused } from 'my-lib'

// unused is not really used
/* unused appears in a block comment */
`
            const result = analyzeModule(source)
            expect(result.unusedImports).toContain('unused')
        })

        it('should not count identifiers inside strings as usage', () => {
            const source = `
import { notUsed } from 'my-lib'

const str = "notUsed is just a string"
const str2 = 'notUsed again'
`
            const result = analyzeModule(source)
            expect(result.unusedImports).toContain('notUsed')
        })
    })

    describe('false positives — strings, templates, comments', () => {
        it('should not pick up "export default" inside a double-quoted string', () => {
            const source = `
import { foo } from 'my-lib'

const str = "export default fakeExport"
foo()
`
            const result = analyzeModule(source)
            expect(result.exports.default).toBe(false)
            expect(result.exports.names).toEqual([])
            expect(result.usedImports).toContain('foo')
        })

        it('should not pick up "export default" inside a single-quoted string', () => {
            const source = `
const str = 'export default fakeExport'
`
            const result = analyzeModule(source)
            expect(result.exports.default).toBe(false)
            expect(result.exports.names).toEqual([])
        })

        it('should not pick up "export default" inside a template string', () => {
            const source = `
const str = \`export default fakeExport\`
`
            const result = analyzeModule(source)
            expect(result.exports.default).toBe(false)
            expect(result.exports.names).toEqual([])
        })

        it('should not pick up "import" inside a string', () => {
            const source = `
const str = "import { fake } from 'fake-lib'"
`
            const result = analyzeModule(source)
            expect(result.imports).toHaveLength(0)
        })

        it('should not pick up "export const" inside a line comment', () => {
            const source = `
// export const commented = 42
`
            const result = analyzeModule(source)
            expect(result.exports.names).toEqual([])
        })

        it('should not pick up "export default" inside a block comment', () => {
            const source = `
/* export default commentedOut */
`
            const result = analyzeModule(source)
            expect(result.exports.default).toBe(false)
        })

        it('should not count usage of identifiers inside strings', () => {
            const source = `
import { realFn } from 'my-lib'

const msg = "realFn is mentioned here but not used"
const msg2 = \`realFn in template too\`
`
            const result = analyzeModule(source)
            expect(result.unusedImports).toContain('realFn')
            expect(result.usedImports).toEqual([])
        })

        it('should not count usage of identifiers inside comments', () => {
            const source = `
import { helper } from 'my-lib'

// helper is referenced in comment
/* helper in block comment too */
`
            const result = analyzeModule(source)
            expect(result.unusedImports).toContain('helper')
            expect(result.usedImports).toEqual([])
        })

        it('should distinguish real usage from mentions in strings and comments', () => {
            const source = `
import { used, fake } from 'my-lib'

// fake is only in comments and strings
const str = "fake appears here"
used()
`
            const result = analyzeModule(source)
            expect(result.usedImports).toEqual(['used'])
            expect(result.unusedImports).toEqual(['fake'])
        })
    })

    describe('combined analysis', () => {
        it('should analyze a realistic module', () => {
            const source = `
import { Node, parse } from '@prostojs/parser'
import type { ParsedNode } from '@prostojs/parser'
import 'reflect-metadata'

export interface Config {
    debug: boolean
}

export function createParser() {
    const root = new Node({ name: 'root', eofClose: true })
    return parse(root, '')
}

export default createParser
`
            const result = analyzeModule(source)

            // Imports
            expect(result.imports).toHaveLength(3)
            expect(result.imports[2].sideEffect).toBe(true)

            // Exports
            expect(result.exports.names).toContain('Config')
            expect(result.exports.names).toContain('createParser')
            expect(result.exports.default).toBe(true)

            // Usage
            expect(result.usedImports).toContain('Node')
            expect(result.usedImports).toContain('parse')
        })
    })
})
