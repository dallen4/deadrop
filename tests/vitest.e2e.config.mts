import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Standalone e2e config (run via `-c`). Resolves @shared/@api via the same
// tsconfig-paths plugin the rest of the repo uses. setupFiles loads tests/.env
// into each worker; CI passes the same vars as real env, so dotenv is a no-op
// there (it never overrides already-set vars).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['e2e/**/*.spec.ts'],
    environment: 'node',
    setupFiles: ['dotenv/config'],
    testTimeout: 90_000,
    hookTimeout: 30_000,
    // One flow at a time: real browsers + WebRTC peers are resource-heavy.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
