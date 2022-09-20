import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './setupTests.js',
  },
});
