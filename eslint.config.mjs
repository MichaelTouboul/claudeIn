import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import-x';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default tseslint.config(
  // Ignore everything we don't actually author.
  {
    ignores: [
      'node_modules/**',
      'out/**',
      'dist/**',
      'electron/**',
      '**/*.config.{js,mjs,cjs,ts}',
      'eslint.config.mjs',
    ],
  },

  // Catch unused `// eslint-disable-*` comments — escape hatches should fail
  // loudly as soon as the underlying issue is gone.
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },

  // Base recommended rule sets.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Renderer source — React + TypeScript.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: '19' },
      'import/resolver': {
        typescript: { project: ['./tsconfig.web.json'] },
      },
    },
    rules: {
      // ── React ───────────────────────────────────────────────
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // new JSX transform handles this
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off', // TypeScript covers it
      'react/jsx-key': 'error',
      // Enforces explicit ternary `{cond ? <X/> : null}` instead of `{cond && <X/>}`
      // — falsy values like 0 or '' would otherwise render their literal text.
      'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary'] }],
      // Array indices as keys cause real bugs (lost state on reorder/filter,
      // wrong rendering during inserts). Use a stable id from the item itself.
      // If the item has no natural id, derive one (e.g., compose multiple
      // fields with `${a.event}:${a.matcher}`).
      'react/no-array-index-key': 'error',

      // ── React hooks ─────────────────────────────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // ── TypeScript ──────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': 'off', // handled by unused-imports
      '@typescript-eslint/no-empty-object-type': 'off', // common in props extending React types

      // ── Imports ─────────────────────────────────────────────
      'import/no-default-export': 'error',
      'import/no-duplicates': 'error',
      'import/no-useless-path-segments': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. Node built-ins
            ['^node:'],
            // 2. External packages
            ['^@?\\w'],
            // 3. Internal aliases (`@/…`)
            ['^@/'],
            // 4. Relative imports
            ['^\\.'],
            // 5. Side-effect imports (always last)
            ['^\\u0000'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Forbid `import * as React from 'react'` and `import React from 'react'`
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['default'],
              message: 'Use named imports from React: `import { useState } from "react"`.',
            },
          ],
          patterns: [
            {
              group: ['react'],
              importNamePattern: '^\\*',
              message: 'Do not use `import * as React`; import what you need by name.',
            },
          ],
        },
      ],

      // ── a11y ────────────────────────────────────────────────
      // Electron desktop app — most jsx-a11y rules are written for public
      // web pages and produce too many false positives on mouse-driven UI
      // primitives like resize handles, accordion rows, and clickable cards.
      // Keep the ones that catch genuine bugs (alt text, label-for); turn
      // off the ones that flag legitimate desktop interactions.
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-autofocus': 'off',

      // Apostrophes in inline JSX text are fine — escaping them hurts readability.
      'react/no-unescaped-entities': 'off',

      // ── Misc safety ─────────────────────────────────────────
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // ── Hard 300-line file limit (matches am-frontend rule) ─
      'max-lines': [
        'error',
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
    },
  },

  // Entry files keep their default export (Vite/React entry contract).
  {
    files: ['src/App.tsx', 'src/main.tsx'],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // Ambient declaration files use globals only — relax type-import rules.
  {
    files: ['src/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'no-restricted-imports': 'off',
      'simple-import-sort/imports': 'off',
    },
  },
);
