import { resolve } from 'path';
import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../vitest.config.mjs';

export default mergeConfig(
  configShared,
  defineProject({
    test: {
      name: 'vscode',
      include: ['tests/unit/**/*.spec.ts'],
      environment: 'node',
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, '../shared'),
        '@api': resolve(__dirname, '../worker'),
        // Only the extension host provides the real module.
        vscode: resolve(__dirname, 'tests/mocks/vscode.ts'),
      },
    },
  }),
);
