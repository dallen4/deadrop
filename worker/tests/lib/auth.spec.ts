import { describe, expect, it } from 'vitest';
import { AuthScopes } from '@shared/lib/constants';
import { ListApiKeysQuerySchema } from '../../src/lib/auth';

const target = { vaultName: 'demo', environment: 'production' };

describe('ListApiKeysQuerySchema', () => {
  // Hono hands a single query param through as a string and only makes
  // an array when it repeats, so both shapes reach the schema.
  it('lifts a single scope param into an array', () => {
    const parsed = ListApiKeysQuerySchema.parse({
      ...target,
      scopes: AuthScopes.VaultInject,
    });

    expect(parsed.scopes).toEqual([AuthScopes.VaultInject]);
  });

  it('keeps a repeated scope param as an array', () => {
    const parsed = ListApiKeysQuerySchema.parse({
      ...target,
      scopes: [AuthScopes.VaultInject, AuthScopes.VaultInject],
    });

    expect(parsed.scopes).toEqual([
      AuthScopes.VaultInject,
      AuthScopes.VaultInject,
    ]);
  });

  it('treats scopes as optional', () => {
    expect(ListApiKeysQuerySchema.parse(target).scopes).toBeUndefined();
  });

  it('rejects a scope outside the known set', () => {
    expect(
      ListApiKeysQuerySchema.safeParse({
        ...target,
        scopes: 'vault:everything',
      }).success,
    ).toBe(false);
  });

  it('requires both halves of the vault target', () => {
    expect(
      ListApiKeysQuerySchema.safeParse({ vaultName: 'demo' }).success,
    ).toBe(false);
    expect(
      ListApiKeysQuerySchema.safeParse({ environment: 'production' })
        .success,
    ).toBe(false);
  });
});
