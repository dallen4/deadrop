// vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const reporters = ['verbose'];

if (process.env.CI)
  reporters.push('json-summary', 'html', 'github-actions');

export default defineConfig({
  test: {
    reporters,
    coverage: {
      provider: 'istanbul',
      reportOnFailure: true,
    },
  },
  plugins: [tsconfigPaths()],
});
