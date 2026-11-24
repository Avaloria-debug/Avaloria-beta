// ESLint para CI (npm install --no-save eslint@9 globals@15 && npx eslint .). Solo errores reales rompen el workflow.
import globals from 'globals';

export default [
  { ignores: ['_site/**', 'node_modules/**'] },
  { linterOptions: { reportUnusedDisableDirectives: 'off' } }, // los eslint-disable vienen del repo de origen, con otra config
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node, ...globals.serviceworker } },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-else-if': 'error',
      'no-redeclare': 'error',
      'no-self-assign': 'error',
      'no-unsafe-finally': 'error',
      'no-loss-of-precision': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }], // `_x` = descartado a propósito
      'no-unreachable': 'warn',
    },
  },
];
