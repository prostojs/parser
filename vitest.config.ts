import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        globals: true,
        include: ['lib/tests/**/*.spec.ts', 'examples/*/tests/**/*.spec.ts'],
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['html', 'lcov', 'text'],
            include: ['lib/src/**/*.ts'],
        },
    },
    resolve: {
        alias: {
            '@prostojs/parser': path.resolve(__dirname, 'lib/src/index.ts'),
        },
    },
})
