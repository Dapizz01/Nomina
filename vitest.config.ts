import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig(({ mode }) =>
    mergeConfig(
        viteConfig,
        defineConfig({
            resolve: {
                conditions: mode === 'test' ? ['browser'] : [],
            },
            test: {
                include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
                environment: 'jsdom',
                setupFiles: ['./src/setupTest.ts'],
                globals: true,
                coverage: {
                    provider: 'v8',
                    reporter: ['text', 'html'],
                    exclude: ['src/lib/components/icons/**'],
                    // Uncomment these thresholds when you are ready to enforce them in CI!
                    // thresholds: {
                    //    lines: 80,
                    //    functions: 80,
                    //    branches: 80,
                    //    statements: 80
                    // }
                }
            },
        })
    )
)
