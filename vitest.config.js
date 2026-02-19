import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: {
		alias: process.env.CI
			? {}
			: { '@comapeo/core-react': path.resolve(__dirname, 'src/index.ts') },
	},
	test: {
		environment: 'happy-dom',
		setupFiles: ['./test/setup.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
	},
})
