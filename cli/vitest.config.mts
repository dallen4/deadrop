import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../vitest.config.mjs';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      include: ['tests/unit/**/*.spec.ts'],
      environment: 'node',
    },
  }),
);
