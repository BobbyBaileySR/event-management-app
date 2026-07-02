import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                // Loaded from CDN in index.html
                Chart: 'readonly',
                // Google Identity Services, attached to window at runtime
                google: 'readonly',
            },
        },
        rules: {
            // Surface accidental leftovers without failing on intentional API stubs
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            eqeqeq: ['error', 'smart'],
            'no-var': 'error',
            'prefer-const': 'warn',
        },
    },
];
