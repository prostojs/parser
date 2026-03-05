import { dts } from 'rollup-plugin-dts'

export default {
    input: './lib/src/index.ts',
    output: {
        file: './lib/dist/index.d.ts',
        format: 'es',
        sourcemap: false,
    },
    plugins: [
        dts({
            tsconfig: 'lib/tsconfig.json',
            compilerOptions: {
                removeComments: false,
            },
        }),
    ],
}
