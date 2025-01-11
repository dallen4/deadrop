// vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const reporters = ['verbose', 'html'];

if (process.env.CI) reporters.push('github-actions');

export default defineConfig({
  test: {
    reporters,
    outputFile: './test-report/index.html',
    coverage: {
      provider: 'istanbul',
      reportOnFailure: true,
    },
  },
  plugins: [tsconfigPaths()],
});
