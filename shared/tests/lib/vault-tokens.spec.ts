import { describe, expect, it } from 'vitest';
import {
  resolveInjectedNames,
  VaultInjectOptionsSchema,
} from '../../lib/vault-tokens';

describe('VaultInjectOptionsSchema', () => {
  // One rule for issuance and verification: anything refused here is
  // refused at auth too, which only holds while no key carries it.
  it.each([
    { only: [] },
    { only: [''] },
    { only: 'DB_URL' },
    { prefix: '' },
    { prefix: 'has space' },
    { prefix: 'has=equals' },
  ])('refuses %j', (options) => {
    expect(VaultInjectOptionsSchema.safeParse(options).success).toBe(
      false,
    );
  });

  it.each([
    {},
    { only: ['DB_URL'] },
    { prefix: 'PROD_' },
    // A shell cannot reach this with $NAME, but inject passes an env
    // block, so it is a warning in the UI and not a rejection here.
    { prefix: 'my-prefix-' },
  ])('accepts %j', (options) => {
    expect(VaultInjectOptionsSchema.safeParse(options).success).toBe(
      true,
    );
  });
});

describe('resolveInjectedNames', () => {
  it('pairs every stored name with the name it injects as', () => {
    expect(
      resolveInjectedNames(['DB_URL', 'API_KEY'], {
        prefix: 'PROD_',
      }),
    ).toEqual([
      ['DB_URL', 'PROD_DB_URL'],
      ['API_KEY', 'PROD_API_KEY'],
    ]);
  });

  it('shapes down to `only`, keeping each pair intact', () => {
    expect(
      resolveInjectedNames(['DB_URL', 'API_KEY'], {
        only: ['API_KEY'],
        prefix: 'PROD_',
      }),
    ).toEqual([['API_KEY', 'PROD_API_KEY']]);
  });

  it('passes names through untouched with no options', () => {
    expect(resolveInjectedNames(['DB_URL'], {})).toEqual([
      ['DB_URL', 'DB_URL'],
    ]);
  });
});
