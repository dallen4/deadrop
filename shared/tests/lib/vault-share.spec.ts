import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { VAULT_PAYLOAD_TYPE } from '../../lib/constants';
import {
  composeVaultShare,
  isVaultShareMeta,
  parseVaultShare,
  pickEnvironments,
} from '../../lib/vault-share';
import type { SharedVault } from '../../types/config';

const share: SharedVault = {
  environments: { production: 'prod-key', staging: 'staging-key' },
  cloud: { name: 'a1b2c3d4e5f67-acme', authToken: 'a-jwt' },
};

describe('composeVaultShare', () => {
  it('nests the vault under its local name', () => {
    expect(parse(composeVaultShare('acme', share))).toEqual({
      vaults: { acme: share },
    });
  });

  it('never emits a location', () => {
    expect(composeVaultShare('acme', share)).not.toContain('location');
  });

  it('round-trips through parseVaultShare', () => {
    expect(parseVaultShare(composeVaultShare('acme', share))).toEqual({
      name: 'acme',
      vault: share,
    });
  });
});

describe('pickEnvironments', () => {
  const vault = {
    location: '/tmp/acme.db',
    environments: {
      development: 'dev-key',
      production: 'prod-key',
    },
  };

  it('keeps only the selected environments', () => {
    expect(pickEnvironments(vault, ['production'])).toEqual({
      production: 'prod-key',
    });
  });

  it('ignores names the vault does not have', () => {
    expect(pickEnvironments(vault, ['production', 'nope'])).toEqual({
      production: 'prod-key',
    });
  });
});

describe('parseVaultShare', () => {
  it('rejects payloads that are not YAML mappings', () => {
    expect(() => parseVaultShare('just a secret')).toThrow(
      'Not a vault share payload.',
    );
  });

  it('rejects a vault with no cloud config', () => {
    const payload = composeVaultShare('acme', {
      environments: { production: 'prod-key' },
    } as unknown as SharedVault);

    expect(() => parseVaultShare(payload)).toThrow(
      'Not a vault share payload.',
    );
  });

  it('rejects a cloud config with an empty name', () => {
    const payload = composeVaultShare('acme', {
      environments: {},
      cloud: { name: '' },
    });

    expect(() => parseVaultShare(payload)).toThrow(
      'Not a vault share payload.',
    );
  });

  it('rejects a payload carrying more than one vault', () => {
    const payload = `vaults:\n  a:\n    environments: {}\n    cloud:\n      name: x\n  b:\n    environments: {}\n    cloud:\n      name: y\n`;

    expect(() => parseVaultShare(payload)).toThrow(
      'exactly one vault',
    );
  });

  it('defaults environments to an empty map when absent', () => {
    const payload = `vaults:\n  acme:\n    cloud:\n      name: a1b2c3d4e5f67-acme\n`;

    expect(parseVaultShare(payload).vault.environments).toEqual({});
  });
});

describe('isVaultShareMeta', () => {
  it('matches the vault payload type', () => {
    expect(
      isVaultShareMeta({ type: VAULT_PAYLOAD_TYPE, name: 'acme' }),
    ).toBe(true);
  });

  it('does not match file or missing meta', () => {
    expect(isVaultShareMeta({ type: 'text/plain', name: 'a.txt' })).toBe(
      false,
    );
    expect(isVaultShareMeta(null)).toBe(false);
    expect(isVaultShareMeta(undefined)).toBe(false);
  });
});
