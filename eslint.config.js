import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const gitignorePath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'.gitignore',
)

const gitExcludePath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'.git',
	'info',
	'exclude',
)

export default tseslint.config(
	js.configs.recommended,
	{
		name: 'typescript',
		extends: tseslint.configs.recommended,
		rules: {
			'@typescript-eslint/array-type': ['warn', { default: 'generic' }],
			// Allow unused vars if prefixed with `_` (https://typescript-eslint.io/rules/no-unused-vars/)
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true,
				},
			],
		},
	},
	...pluginQuery.configs['flat/recommended'],
	{ files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	{
		name: 'node',
		files: ['**/*.config.js'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.nodeBuiltin,
				...globals.worker,
			},
		},
	},
	includeIgnoreFile(gitignorePath),
	includeIgnoreFile(gitExcludePath),
)
