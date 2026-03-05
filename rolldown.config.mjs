import dyePlugin from '@prostojs/dye/rolldown'

const external = []

export default [
    {
        external,
        input: './lib/src/index.ts',
        output: {
            file: './lib/dist/index.mjs',
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
        input: './lib/src/index.ts',
        output: {
            file: './lib/dist/index.cjs',
            format: 'cjs',
            sourcemap: false,
        },
        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
        },
        plugins: [dyePlugin()],
    },
]
