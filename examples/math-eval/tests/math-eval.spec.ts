import { describe, it, expect } from 'vitest'
import { evaluate } from '../src/math-eval'

describe('Math expression evaluator', () => {
    describe('simple arithmetic', () => {
        it('should add two numbers', () => {
            expect(evaluate('2 + 3')).toBe(5)
        })

        it('should subtract two numbers', () => {
            expect(evaluate('10 - 4')).toBe(6)
        })

        it('should multiply two numbers', () => {
            expect(evaluate('3 * 5')).toBe(15)
        })

        it('should divide two numbers', () => {
            expect(evaluate('10 / 2')).toBe(5)
        })
    })

    describe('operator precedence', () => {
        it('should evaluate multiplication before addition', () => {
            expect(evaluate('2 + 3 * 4')).toBe(14)
        })

        it('should evaluate multiplication before subtraction', () => {
            expect(evaluate('10 - 2 * 3')).toBe(4)
        })

        it('should handle mixed precedence', () => {
            expect(evaluate('2 + 3 * 4 - 1')).toBe(13)
        })

        it('should handle multiple multiplications', () => {
            expect(evaluate('2 * 3 * 4')).toBe(24)
        })
    })

    describe('parentheses', () => {
        it('should override precedence with parentheses', () => {
            expect(evaluate('(2 + 3) * 4')).toBe(20)
        })

        it('should handle nested parentheses', () => {
            expect(evaluate('((1 + 2) * (3 + 4))')).toBe(21)
        })

        it('should handle deeply nested parentheses', () => {
            expect(evaluate('(1 + (2 * (3 + 4)))')).toBe(15)
        })

        it('should handle parentheses at different positions', () => {
            expect(evaluate('4 * (2 + 3)')).toBe(20)
        })

        it('should handle adjacent parenthesized groups', () => {
            expect(evaluate('(2 + 3) * (4 + 1)')).toBe(25)
        })
    })

    describe('decimals', () => {
        it('should handle decimal numbers', () => {
            expect(evaluate('3.14 * 2')).toBeCloseTo(6.28)
        })

        it('should handle decimal results', () => {
            expect(evaluate('1.5 + 2.5')).toBe(4)
        })
    })

    describe('negative numbers', () => {
        it('should handle negative number at the start', () => {
            expect(evaluate('-5 + 3')).toBe(-2)
        })

        it('should handle negative result', () => {
            expect(evaluate('3 - 10')).toBe(-7)
        })
    })

    describe('division', () => {
        it('should handle non-integer division', () => {
            expect(evaluate('10 / 3')).toBeCloseTo(3.333333, 4)
        })

        it('should handle division with precedence', () => {
            expect(evaluate('10 + 6 / 3')).toBe(12)
        })
    })

    describe('whitespace tolerance', () => {
        it('should handle no spaces', () => {
            expect(evaluate('2+3')).toBe(5)
        })

        it('should handle extra spaces', () => {
            expect(evaluate('  2  +  3  ')).toBe(5)
        })
    })
})
