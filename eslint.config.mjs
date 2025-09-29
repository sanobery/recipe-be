import pluginJs from '@eslint/js'
import pluginTs from '@typescript-eslint/eslint-plugin'
import parserTs from '@typescript-eslint/parser'
import pluginPrettier from 'eslint-plugin-prettier'
import globals from 'globals'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
    // JavaScript base config
    {
        ...pluginJs.configs.recommended,
        languageOptions: {
            ...pluginJs.configs.recommended.languageOptions,
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
    },

    // TypeScript config
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: parserTs,
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 'latest',
                project: './tsconfig.json',
            },
        },
        plugins: {
            '@typescript-eslint': pluginTs,
            prettier: pluginPrettier,
        },
        rules: {
            ...pluginTs.configs.recommended.rules,
            'prettier/prettier': 'warn',
        },
    },
]
