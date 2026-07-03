import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
	js.configs.recommended,
	{
		files: ['src/**/*.{ts,tsx}'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2022,
			sourceType: 'module',
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
			globals: {
				...globals.browser,
				google: 'readonly',
				RequestInit: 'readonly',
				GoogleAccountsId: 'readonly',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			eqeqeq: ['error', 'smart'],
			'no-var': 'error',
			'prefer-const': 'warn',
			'no-restricted-syntax': [
				'error',
				{
					selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
					message: 'dangerouslySetInnerHTML is banned — JSX text content auto-escapes (XSS).',
				},
			],
		},
	},
];
