// Análisis estático: detecta variables sin definir o sin importar, imports rotos y errores comunes antes de que lleguen al navegador.
import globals from 'globals';

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
  'no-unreachable': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-imports': 'error',
  'no-self-assign': 'error',
  'no-const-assign': 'error',
  'no-import-assign': 'error',
  'no-func-assign': 'error',
  'no-redeclare': 'error',
  'no-shadow-restricted-names': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'no-cond-assign': ['error', 'except-parens'],
  'no-constant-condition': ['error', { checkLoops: false }],
  'no-unsafe-finally': 'error',
  'no-unsafe-negation': 'error',
  'no-async-promise-executor': 'error',
  'require-yield': 'error',
  'getter-return': 'error',
  'no-setter-return': 'error',
  'no-dupe-else-if': 'error',
  'no-dupe-class-members': 'error',
  'no-compare-neg-zero': 'error',
  'no-sparse-arrays': 'error',
  'no-loss-of-precision': 'error',
  'eqeqeq': ['error', 'smart'],
};

export default [
  { ignores: ['node_modules/**', 'data/**', 'public/vendor/**'] },
  { files: ['public/**/*.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser } }, rules },
  { files: ['public/sw.js'], languageOptions: { sourceType: 'script', globals: { ...globals.serviceworker } } },
  { files: ['server/**/*.js', 'scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } }, rules },
];
