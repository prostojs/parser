import { defineConfig } from 'vitest/config'
import { createDyeReplacements } from '@prostojs/dye/common'
import pkg from './package.json'

// createDyeReplacements returns values meant for rollup's replace plugin.
// Some have proper \u001b escapes, others have raw ESC bytes — normalize them
// to valid JS string literals for Vite/esbuild's define.
const dyeDefine: Record<string, string> = {}
for (const [key, value] of Object.entries(createDyeReplacements())) {
    // Strip surrounding quotes, then re-stringify to get consistent escaping
    const raw = value.slice(1, -1)
    // Replace literal \u001b text with actual ESC byte before JSON.stringify re-escapes it
    const normalized = raw.replace(/\\u001b/g, '\x1B')
    dyeDefine[key] = JSON.stringify(normalized)
}

export default defineConfig({
    test: {
        globals: true,
        include: ['**/*.spec.ts'],
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['html', 'lcov', 'text'],
            include: ['src/**/*.ts'],
        },
    },
    define: {
        __DEV__: true,
        __TEST__: true,
        __VERSION__: JSON.stringify(pkg.version),
        __BROWSER__: false,
        __GLOBAL__: false,
        __ESM_BUNDLER__: true,
        __ESM_BROWSER__: false,
        __NODE_JS__: true,
        ...dyeDefine,
    },
})
