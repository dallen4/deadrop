import { describe, expect, it } from 'vitest';
import { vault } from 'lib/vault';

describe('vault()', () => {
  it('seeds development and production environments, each with their own key', async () => {
    const config = await vault('/tmp/some-vault.db');

    const environments = Object.keys(config.environments);

    expect(environments).toEqual(
      expect.arrayContaining(['development', 'production']),
    );
    expect(environments).toHaveLength(2);
    expect(config.environments.development).not.toEqual(
      config.environments.production,
    );
  });
});
