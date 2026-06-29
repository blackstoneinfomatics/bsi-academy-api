module.exports = {
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  overrides: [
    {
      files: ['*.test.js', '*.test.ts', 'tests/**/*.js', 'tests/**/*.ts'], // Include TypeScript test files
      env: {
        jest: true,
      },
      rules: {
        'node/no-process-env': 'off',
      },
    },
  ],
  rules: {
    // If needed, you can add or override TypeScript-specific rules here
  },
};
