/** @type {import('prettier').Config} */
export default {
	tabWidth: 2,
	useTabs: true,
	semi: false,
	singleQuote: true,
	arrowParens: 'always',
	trailingComma: 'all',
	plugins: ['@ianvs/prettier-plugin-sort-imports'],
	// Options for @ianvs/prettier-plugin-sort-imports
	importOrder: ['<BUILTIN_MODULES>', '<THIRD_PARTY_MODULES>', '', '^[./]'],
	importOrderTypeScriptVersion: '5.8.3',
	importOrderCaseSensitive: false,
}
