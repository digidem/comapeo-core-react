import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import * as pluginReactHooks from 'eslint-plugin-react-hooks'
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
	includeIgnoreFile(gitignorePath),
	includeIgnoreFile(gitExcludePath),
	js.configs.recommended,
	{
		files: ['**/*.{js,ts,jsx,tsx}'],
		extends: [
			tseslint.configs.recommended,
			pluginQuery.configs['flat/recommended'],
			pluginReactHooks.configs['recommended-latest'],
		],
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
			'react-hooks/exhaustive-deps': 'error',
			'react-hooks/rules-of-hooks': 'error',
		},
	},
	{
		name: 'node',
		files: ['**/*.config.js', 'test/**/*'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.nodeBuiltin,
				...globals.worker,
			},
		},
	},
)
