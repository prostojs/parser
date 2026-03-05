import { describe, it, expect } from 'vitest'
import { parseTemplate } from '../src/template-string'

describe('Template string parser', () => {
    it('should parse plain text with no expressions', () => {
        expect(parseTemplate('hello')).toEqual(['hello'])
    })

    it('should parse a single expression', () => {
        expect(parseTemplate('{{name}}')).toEqual([{ expr: 'name' }])
    })

    it('should parse mixed text and expressions', () => {
        expect(parseTemplate('Hello {{name}}!')).toEqual([
            'Hello ',
            { expr: 'name' },
            '!',
        ])
    })

    it('should parse multiple expressions', () => {
        expect(parseTemplate('{{a}} and {{b}}')).toEqual([
            { expr: 'a' },
            ' and ',
            { expr: 'b' },
        ])
    })

    it('should preserve inner whitespace in expressions', () => {
        expect(parseTemplate('{{ a + b }}')).toEqual([{ expr: ' a + b ' }])
    })

    it('should return an empty array for empty input', () => {
        expect(parseTemplate('')).toEqual([])
    })

    it('should parse adjacent expressions', () => {
        expect(parseTemplate('{{a}}{{b}}')).toEqual([
            { expr: 'a' },
            { expr: 'b' },
        ])
    })
})
