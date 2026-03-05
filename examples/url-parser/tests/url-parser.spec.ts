import { describe, it, expect } from 'vitest'
import { parseUrl } from '../src/url-parser'

describe('URL parser', () => {
    it('should parse a full URL with all components', () => {
        const result = parseUrl('https://user:pass@example.com:8080/path?q=1&b=2#hash')
        expect(result).toEqual({
            protocol: 'https',
            username: 'user',
            password: 'pass',
            host: 'example.com',
            port: '8080',
            path: '/path',
            query: { q: '1', b: '2' },
            hash: 'hash',
        })
    })

    it('should parse a simple URL', () => {
        const result = parseUrl('https://example.com')
        expect(result).toEqual({
            protocol: 'https',
            host: 'example.com',
            path: '/',
            query: {},
        })
    })

    it('should parse a URL with path', () => {
        const result = parseUrl('https://example.com/path/to/page')
        expect(result).toEqual({
            protocol: 'https',
            host: 'example.com',
            path: '/path/to/page',
            query: {},
        })
    })

    it('should parse a URL with query only', () => {
        const result = parseUrl('https://example.com?key=value')
        expect(result).toEqual({
            protocol: 'https',
            host: 'example.com',
            path: '/',
            query: { key: 'value' },
        })
    })

    it('should parse a URL with hash only', () => {
        const result = parseUrl('https://example.com#section')
        expect(result).toEqual({
            protocol: 'https',
            host: 'example.com',
            path: '/',
            query: {},
            hash: 'section',
        })
    })

    it('should parse a URL without protocol', () => {
        const result = parseUrl('example.com/path')
        expect(result).toEqual({
            host: 'example.com',
            path: '/path',
            query: {},
        })
    })

    it('should parse a URL with port', () => {
        const result = parseUrl('http://localhost:3000/api')
        expect(result).toEqual({
            protocol: 'http',
            host: 'localhost',
            port: '3000',
            path: '/api',
            query: {},
        })
    })

    it('should parse multiple query params', () => {
        const result = parseUrl('https://example.com?a=1&b=2&c=3')
        expect(result).toEqual({
            protocol: 'https',
            host: 'example.com',
            path: '/',
            query: { a: '1', b: '2', c: '3' },
        })
    })

    it('should parse auth without password', () => {
        const result = parseUrl('https://user@example.com')
        expect(result).toEqual({
            protocol: 'https',
            username: 'user',
            host: 'example.com',
            path: '/',
            query: {},
        })
    })
})
