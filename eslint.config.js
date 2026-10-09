import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    // public/bot is a published BMAIR release, copied unmodified and checked by test/bot.test.js.
    ignores: ['public/specs/specifications.json', 'public/bot/**', 'node_modules/**'],
  },
  {
    files: ['public/js/**/*.js', 'public/specs/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.serviceworker },
    },
  },
  {
    files: ['scripts/**/*.js', 'test/**/*.js', 'eslint.config.js', 'playwright.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
];
