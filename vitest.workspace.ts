import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'cli/vitest.config.mts',
  'web/vitest.config.mts',
  {
    extends: './vitest.config.mts',
    test: {
      include: ['shared/tests/**/*.spec.ts'],
      name: 'shared (browser)',
      // using happy-dom, but will swap to jsdom if hits limitations
      environment: 'happy-dom',
    },
  },
  {
    extends: './vitest.config.mts',
    test: {
      include: ['shared/tests/**/*.spec.ts'],
      name: 'shared (node)',
      environment: 'node',
    },
  },
]);
