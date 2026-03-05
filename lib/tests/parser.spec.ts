import { describe, it, expect } from 'vitest'
import { Node, parse, textContent, children, printTree } from '../src/index'

describe('Parser v2', () => {
    describe('basic parsing', () => {
        it('should parse simple delimited block', () => {
            const block = new Node({ name: 'block', start: '{', end: '}' })
            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            const result = parse(root, 'hello {world} end')

            expect(result.content).toHaveLength(3)
            expect(result.content[0]).toBe('hello ')
            const child = result.content[1] as any
            expect(child.node).toBe(block)
            expect(child.content).toEqual(['{world}'])
            expect(result.content[2]).toBe(' end')
        })

        it('should parse with omitted tokens', () => {
            const block = new Node({
                name: 'block',
                start: { token: '{', omit: true },
                end: { token: '}', omit: true },
            })
            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            const result = parse(root, 'a{b}c')

            expect(result.content).toHaveLength(3)
            expect(result.content[0]).toBe('a')
            const child = result.content[1] as any
            expect(child.content).toEqual(['b'])
            expect(result.content[2]).toBe('c')
        })

        it('should parse nested blocks', () => {
            const block = new Node({
                name: 'block',
                start: { token: '{', omit: true },
                end: { token: '}', omit: true },
            })
            block.recognize(block)
            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            const result = parse(root, '{a{b}c}')

            const outer = result.content[0] as any
            expect(outer.content).toHaveLength(3)
            expect(outer.content[0]).toBe('a')
            const inner = outer.content[1] as any
            expect(inner.content).toEqual(['b'])
            expect(outer.content[2]).toBe('c')
        })
    })

    describe('hooks', () => {
        it('should fire onOpen and onClose hooks', () => {
            const opened: string[] = []
            const closed: string[] = []

            const block = new Node<{ name: string }>({
                name: 'block',
                start: { token: /\[(?<name>\w+)/, omit: true },
                end: { token: ']', omit: true },
                data: { name: '' },
                // name auto-mapped from named group
            })
                .onOpen((node) => {
                    opened.push(node.data.name)
                })
                .onClose((node) => {
                    closed.push(node.data.name)
                })

            block.recognize(block)
            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            parse(root, '[a hello [b world] end]')

            expect(opened).toEqual(['a', 'b'])
            expect(closed).toEqual(['b', 'a'])
        })

        it('should reject match with onOpen returning false', () => {
            const block = new Node({
                name: 'block',
                start: '{',
                end: '}',
            })
                .onOpen(() => false)

            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            const result = parse(root, 'a{b}c')

            // Everything treated as text since match rejected
            expect(result.content).toEqual(['a{b}c'])
        })

        it('should transform content with onContent hook', () => {
            const block = new Node({
                name: 'block',
                start: { token: '{', omit: true },
                end: { token: '}', omit: true },
            })
                .onContent((text) => text.toUpperCase())

            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            const result = parse(root, '{hello}')

            const child = result.content[0] as any
            expect(child.content).toEqual(['HELLO'])
        })

        it('should fire onChild hook', () => {
            const kids: string[] = []
            const inner = new Node({
                name: 'inner',
                start: { token: '(', omit: true },
                end: { token: ')', omit: true },
            })

            const outer = new Node({
                name: 'outer',
                start: { token: '{', omit: true },
                end: { token: '}', omit: true },
                recognizes: [inner],
            })
                .onChild((child) => {
                    kids.push(textContent(child))
                })

            const root = new Node({ name: 'root', eofClose: true, recognizes: [outer] })
            parse(root, '{a(b)c(d)e}')

            expect(kids).toEqual(['b', 'd'])
        })
    })

    describe('custom data with named groups', () => {
        it('should auto-map named groups to data', () => {
            const param = new Node<{ name: string }>({
                name: 'param',
                start: { token: /:(?<name>\w+)/, omit: true },
                end: { token: /[/\s]/, eject: true },
                data: { name: '' },
                // name auto-mapped from named group — no onOpen needed
            })

            const root = new Node({ name: 'root', eofClose: true, recognizes: [param] })
            const result = parse(root, '/users/:id/posts/:postId end')

            const params = children(result)
            expect(params).toHaveLength(2)
            expect(params[0].data.name).toBe('id')
            expect(params[1].data.name).toBe('postId')
        })
    })

    describe('eject tokens', () => {
        it('should not consume ejected tokens', () => {
            const word = new Node({
                name: 'word',
                start: { token: /\w+/, omit: false },
                end: { token: /\s/, eject: true },
                eofClose: true,
            })

            const root = new Node({ name: 'root', eofClose: true, recognizes: [word] })
            const result = parse(root, 'hello world')

            const words = children(result)
            expect(words).toHaveLength(2)
            expect(textContent(words[0])).toBe('hello')
            expect(textContent(words[1])).toBe('world')
        })
    })

    describe('skip and bad tokens', () => {
        it('should skip whitespace', () => {
            const block = new Node({
                name: 'block',
                start: { token: '{', omit: true },
                end: { token: '}', omit: true },
                skip: /\s+/,
            })

            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            const result = parse(root, '{ hello world }')

            const child = result.content[0] as any
            expect(child.content).toEqual(['helloworld'])
        })

        it('should throw on bad tokens', () => {
            const block = new Node({
                name: 'block',
                start: { token: '{', omit: true },
                end: { token: '}', omit: true },
                bad: /[0-9]/,
            })

            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            expect(() => parse(root, '{abc123}')).toThrow(/Unexpected token "1"/)
        })
    })

    describe('backslash escaping', () => {
        it('should skip backslash-escaped tokens', () => {
            const str = new Node({
                name: 'string',
                start: { token: '"', omit: true },
                end: { token: '"', omit: true, backslash: true },
            })

            const root = new Node({ name: 'root', eofClose: true, recognizes: [str] })
            const result = parse(root, '"hello \\"world\\" end"')

            const child = result.content[0] as any
            expect(child.content).toEqual(['hello \\"world\\" end'])
        })
    })

    describe('dynamic tokens', () => {
        it('should support dynamic end tokens', () => {
            const quoted = new Node<{ quote: string }>({
                name: 'quoted',
                start: { token: /(?<quote>["'])/, omit: true },
                end: { token: (ctx) => ctx.node.data.quote || '"', omit: true },
                data: { quote: '' },
                // quote auto-mapped from named group — no onOpen needed
            })

            const root = new Node({ name: 'root', eofClose: true, recognizes: [quoted] })

            const result1 = parse(root, `"hello" 'world'`)
            const q = children(result1)
            expect(q).toHaveLength(2)
            expect(textContent(q[0])).toBe('hello')
            expect(textContent(q[1])).toBe('world')
        })
    })

    describe('error handling', () => {
        it('should throw on unclosed nodes', () => {
            const block = new Node({
                name: 'block',
                start: '{',
                end: '}',
            })

            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            expect(() => parse(root, '{unclosed')).toThrow(/Unclosed node "block"/)
        })
    })

    describe('printTree utility', () => {
        it('should print a readable tree', () => {
            const block = new Node<{ type: string }>({
                name: 'block',
                start: { token: '{', omit: true },
                end: { token: '}', omit: true },
                data: () => ({ type: 'curly' }),
            })
            block.recognize(block)

            const root = new Node({ name: 'root', eofClose: true, recognizes: [block] })
            const result = parse(root, 'a{b{c}d}e')
            const tree = printTree(result)

            expect(tree).toContain('root')
            expect(tree).toContain('block')
        })
    })
})
