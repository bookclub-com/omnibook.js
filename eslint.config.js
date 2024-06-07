import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config({ 
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.strict,
    ...tseslint.configs.stylistic,
  ],
  // I can't figure out why sometimes dist/index.cjs appears in lint errors
  ignores: ['dist/**'],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [ "error", { "ignoreRestSiblings": true,
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_" } ], // because an error is a bit overkill for unused variables. Allows overriding using _ prefixed var names.
   }},
);
