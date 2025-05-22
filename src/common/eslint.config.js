const { server } = require('@ugrc/eslint-config');

module.exports = [
  ...server,
  {
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
