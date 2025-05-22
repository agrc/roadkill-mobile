import { browser, server } from '@ugrc/eslint-config';

export default [
  ...server,
  ...browser,
  {
    ignores: ['build/**', 'public/build/**', '.cache/**'],
  },
];
