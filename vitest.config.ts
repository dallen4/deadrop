// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['verbose', 'json', 'html'],
    coverage: {
      provider: 'istanbul',
    },
  },
});
