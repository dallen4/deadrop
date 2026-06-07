import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Standalone e2e config (run explicitly via `-c`, so the unit config and the
// root workspace never pick these specs up). Resolves @shared/@api via the
// same tsconfig-paths plugin the rest of the repo uses.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/e2e/**/*.spec.ts'],
    environment: 'node',
    // Load cli/.env into each forked worker (CI passes these as real env vars,
    // so this is a no-op there). dotenv does not override already-set vars, so
    // CI/explicit env wins. No globalSetup needed: the drop test token is a
    // stable value read from the env (DROP_TEST_TOKEN), not seeded per run.
    setupFiles: ['dotenv/config'],
    testTimeout: 90_000,
    hookTimeout: 30_000,
    // One flow at a time: the drop token is a single shared Redis key and
    // WebRTC peers are chatty. Keeps the first proof deterministic.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
