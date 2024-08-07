// @ts-check

import { includeIgnoreFile } from '@eslint/compat'
import pluginJs from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

const gitignorePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '.gitignore',
)

const config = [
  includeIgnoreFile(gitignorePath),
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginQuery.configs['flat/recommended'],
]

export default config
