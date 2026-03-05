import dyePlugin from '@prostojs/dye/rolldown'

const external = [
    'url',
    'crypto',
    'stream',
    'packages/*/src',
    'http',
    'path',
    '@prostojs/tree',
]

export default [
    {
        external,
        input: './src/index.ts',
        output: {
            file: './dist/index.mjs',
            format: 'esm',
            sourcemap: false,
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
        },
        plugins: [dyePlugin()],
    },
    {
        external,
        input: './src/index.ts',
        output: {
            file: './dist/index.cjs',
            format: 'cjs',
            sourcemap: false,
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
        },
        plugins: [dyePlugin()],
    },
]
