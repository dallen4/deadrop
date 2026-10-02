import { describe, expect, it } from 'vitest';
import { AuthScopes } from '@shared/config/plans';
import { ListApiKeysQuerySchema } from '../../src/lib/auth';
import { ScopeToClaimValidator } from '../../src/lib/middleware';

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
    expect(
      ListApiKeysQuerySchema.parse(target).scopes,
    ).toBeUndefined();
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

describe('ScopeToClaimValidator', () => {
  const claims = {
    vaultName: 'hash13-demo',
    environment: 'production',
  };

  it('verifies a well-formed claim', () => {
    expect(
      ScopeToClaimValidator[AuthScopes.VaultInject].safeParse({
        ...claims,
        only: ['DB_URL'],
        prefix: 'PROD_',
      }).success,
    ).toBe(true);
  });

  // Mirrors issuance on purpose. If this ever has to accept something
  // POST /auth/keys refuses, verification needs its own schema — a live
  // key failing here surfaces as "missing necessary scopes".
  it.each([{ only: [] }, { prefix: '' }])(
    'refuses %j, exactly as issuance does',
    (options) => {
      expect(
        ScopeToClaimValidator[AuthScopes.VaultInject].safeParse({
          ...claims,
          ...options,
        }).success,
      ).toBe(false);
    },
  );

  it('refuses claims missing the vault target', () => {
    expect(
      ScopeToClaimValidator[AuthScopes.VaultInject].safeParse({
        prefix: 'PROD_',
      }).success,
    ).toBe(false);
  });
});
