import { SECRET_VALUE_DELIMITER } from 'lib/constants';
import { unwrapSecret, wrapSecret } from 'lib/secrets';
import { initEnvKey } from 'lib/vault';
import { describe, expect, it } from 'vitest';

describe('secret wrapping for vaults', () => {
  it(`wrapping secret should result in a string following '<iv> | <data>'`, async () => {
    const key = await initEnvKey();

    const encryptedData = await wrapSecret(key, 'secretValue');

    const [iv, secret] = encryptedData.split(SECRET_VALUE_DELIMITER);

    expect(iv.length > 0).toBeTruthy();
    expect(secret.length > 0).toBeTruthy();
  });

  it('can encrypt & decrypt secret with only the key & (relative) value', async () => {
    const secretValue = 'superSecretValue';
    const key = await initEnvKey();

    const encryptedData = await wrapSecret(key, secretValue);

    const decryptedData = await unwrapSecret(key, encryptedData);

    expect(decryptedData).toEqual(secretValue);
  });
});
