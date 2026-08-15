import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const typedParserOptions = {
  projectService: true,
  tsconfigRootDir: import.meta.dirname,
}

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '.turbo/**',
    'playwright-report/**',
  ]),
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        ...typedParserOptions,
      },
    },
  })),
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ...typedParserOptions,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@listcollab/api', '../api/*', '../../api/*', '../../../apps/api/*'],
        },
      ],
    },
  },
  {
    files: ['apps/api/**/*.{ts,js}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: {
        ...typedParserOptions,
      },
    },
    rules: {
      'no-console': 'error',
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Use apps/api/src/config/env.ts instead of reading process.env directly.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@listcollab/web', '../web/*', '../../web/*', '../../../apps/web/*'],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/config/env.ts', 'apps/api/**/*.test.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['apps/api/scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['packages/shared/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      parserOptions: {
        ...typedParserOptions,
      },
    },
  },
  prettierConfig,
])
