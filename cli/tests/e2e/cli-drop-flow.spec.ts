import { expect, test } from 'vitest';
import { dropCli, grabCli } from './util';

// CLI-to-CLI mirror of web/tests/e2e/drop-flow.spec.ts: one `deadrop` process
// drops a text secret, a second `deadrop` process grabs it over a real
// node-datachannel WebRTC connection, and we assert the round-tripped value.
test('drops a text secret from one CLI process to another', async () => {
  const secretValue = 'super secret value';

  const { id } = await dropCli(secretValue);
  expect(id).toBeTruthy();

  const grabbedSecretValue = await grabCli(id);
  expect(grabbedSecretValue).toEqual(secretValue);
});
