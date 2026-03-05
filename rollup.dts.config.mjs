import { dts } from 'rollup-plugin-dts'

const external = [
    'url',
    'crypto',
    'stream',
    'packages/*/src',
    'http',
    'path',
    '@prostojs/tree',
]

export default {
    external,
    input: './src/index.ts',
    output: {
        file: './dist/index.d.ts',
        format: 'es',
        sourcemap: false,
    },
    plugins: [
        dts({
            tsconfig: 'tsconfig.json',
            compilerOptions: {
                removeComments: false,
            },
        }),
    ],
}
