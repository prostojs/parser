import { describe, it, expect } from 'vitest'
import { parseJson } from '../src/json-parser'

describe('JSON parser', () => {
    describe('primitives', () => {
        it('should parse strings', () => {
            expect(parseJson('"hello"')).toBe('hello')
            expect(parseJson('"hello world"')).toBe('hello world')
            expect(parseJson('""')).toBe('')
        })

        it('should parse strings with escapes', () => {
            expect(parseJson('"hello\\nworld"')).toBe('hello\nworld')
            expect(parseJson('"tab\\there"')).toBe('tab\there')
            expect(parseJson('"quote\\"here"')).toBe('quote"here')
            expect(parseJson('"back\\\\slash"')).toBe('back\\slash')
        })

        it('should parse unicode escapes', () => {
            expect(parseJson('"\\u0041"')).toBe('A')
            expect(parseJson('"\\u00e9"')).toBe('\u00e9')
        })

        it('should parse numbers', () => {
            expect(parseJson('42')).toBe(42)
            expect(parseJson('3.14')).toBe(3.14)
            expect(parseJson('-1')).toBe(-1)
            expect(parseJson('0')).toBe(0)
            expect(parseJson('1e10')).toBe(1e10)
        })

        it('should parse booleans', () => {
            expect(parseJson('true')).toBe(true)
            expect(parseJson('false')).toBe(false)
        })

        it('should parse null', () => {
            expect(parseJson('null')).toBe(null)
        })
    })

    describe('arrays', () => {
        it('should parse empty array', () => {
            expect(parseJson('[]')).toEqual([])
        })

        it('should parse array of numbers', () => {
            expect(parseJson('[1, 2, 3]')).toEqual([1, 2, 3])
        })

        it('should parse array of strings', () => {
            expect(parseJson('["a", "b", "c"]')).toEqual(['a', 'b', 'c'])
        })

        it('should parse mixed array', () => {
            expect(parseJson('[1, "two", true, null]')).toEqual([1, 'two', true, null])
        })

        it('should parse nested arrays', () => {
            expect(parseJson('[[1, 2], [3, 4]]')).toEqual([[1, 2], [3, 4]])
        })
    })

    describe('objects', () => {
        it('should parse empty object', () => {
            expect(parseJson('{}')).toEqual({})
        })

        it('should parse simple object', () => {
            expect(parseJson('{"name": "Alice", "age": 30}')).toEqual({
                name: 'Alice',
                age: 30,
            })
        })

        it('should parse nested objects', () => {
            expect(parseJson('{"a": {"b": {"c": 1}}}')).toEqual({
                a: { b: { c: 1 } },
            })
        })

        it('should parse object with array values', () => {
            expect(parseJson('{"items": [1, 2, 3]}')).toEqual({
                items: [1, 2, 3],
            })
        })

        it('should parse object with boolean and null values', () => {
            expect(parseJson('{"active": true, "deleted": false, "data": null}')).toEqual({
                active: true,
                deleted: false,
                data: null,
            })
        })
    })

    describe('complex documents', () => {
        it('should parse a realistic JSON document', () => {
            const input = JSON.stringify({
                name: 'prostojs',
                version: '0.6.0',
                dependencies: {
                    typescript: '^5.0.0',
                },
                keywords: ['parser', 'toolkit'],
                private: false,
                config: null,
            })
            const result = parseJson(input)
            expect(result).toEqual({
                name: 'prostojs',
                version: '0.6.0',
                dependencies: {
                    typescript: '^5.0.0',
                },
                keywords: ['parser', 'toolkit'],
                private: false,
                config: null,
            })
        })

        it('should handle whitespace formatting', () => {
            const input = `{
  "name": "test",
  "items": [
    1,
    2,
    3
  ]
}`
            expect(parseJson(input)).toEqual({
                name: 'test',
                items: [1, 2, 3],
            })
        })
    })
})
