import { describe, it, expect } from 'vitest'
import { parseSelector } from '../src/css-selector'

describe('CSS Selector Parser', () => {
    it('should parse a simple tag', () => {
        expect(parseSelector('div')).toEqual([
            { tag: 'div', classes: [], attributes: [], pseudos: [] },
        ])
    })

    it('should parse a class selector', () => {
        expect(parseSelector('.myClass')).toEqual([
            { classes: ['myClass'], attributes: [], pseudos: [] },
        ])
    })

    it('should parse an ID selector', () => {
        expect(parseSelector('#myId')).toEqual([
            { id: 'myId', classes: [], attributes: [], pseudos: [] },
        ])
    })

    it('should parse tag + class + id', () => {
        expect(parseSelector('div.foo#bar')).toEqual([
            { tag: 'div', id: 'bar', classes: ['foo'], attributes: [], pseudos: [] },
        ])
    })

    it('should parse multiple classes', () => {
        expect(parseSelector('.a.b.c')).toEqual([
            { classes: ['a', 'b', 'c'], attributes: [], pseudos: [] },
        ])
    })

    it('should parse an attribute selector', () => {
        expect(parseSelector('input[type="text"]')).toEqual([
            {
                tag: 'input',
                classes: [],
                attributes: [{ name: 'type', op: '=', value: 'text' }],
                pseudos: [],
            },
        ])
    })

    it('should parse a pseudo selector', () => {
        expect(parseSelector('a:hover')).toEqual([
            { tag: 'a', classes: [], attributes: [], pseudos: ['hover'] },
        ])
    })

    it('should parse child combinator', () => {
        expect(parseSelector('div > span')).toEqual([
            { tag: 'div', classes: [], attributes: [], pseudos: [] },
            { combinator: '>', tag: 'span', classes: [], attributes: [], pseudos: [] },
        ])
    })

    it('should parse descendant combinator', () => {
        expect(parseSelector('div span')).toEqual([
            { tag: 'div', classes: [], attributes: [], pseudos: [] },
            { combinator: ' ', tag: 'span', classes: [], attributes: [], pseudos: [] },
        ])
    })

    it('should parse a complex selector', () => {
        const result = parseSelector('div.container > ul.list > li.item:first-child')
        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({
            tag: 'div',
            classes: ['container'],
            attributes: [],
            pseudos: [],
        })
        expect(result[1]).toEqual({
            combinator: '>',
            tag: 'ul',
            classes: ['list'],
            attributes: [],
            pseudos: [],
        })
        expect(result[2]).toEqual({
            combinator: '>',
            tag: 'li',
            classes: ['item'],
            attributes: [],
            pseudos: ['first-child'],
        })
    })

    it('should parse the full example selector', () => {
        const result = parseSelector('div.className#myId > span[data-attr="value"]:hover')
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
            tag: 'div',
            id: 'myId',
            classes: ['className'],
            attributes: [],
            pseudos: [],
        })
        expect(result[1]).toEqual({
            combinator: '>',
            tag: 'span',
            classes: [],
            attributes: [{ name: 'data-attr', op: '=', value: 'value' }],
            pseudos: ['hover'],
        })
    })
})
