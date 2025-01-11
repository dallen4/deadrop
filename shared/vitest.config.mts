import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../vitest.config.mts';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      environment: 'node',
    },
  }),
);
