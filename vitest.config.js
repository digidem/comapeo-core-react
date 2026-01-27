import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'happy-dom',
		setupFiles: ['./test/setup.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
	},
})
