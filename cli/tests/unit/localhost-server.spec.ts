import { describe, expect, it } from 'vitest';
import { createLocalAuthServer } from '../../lib/auth/localhostServer';
import { LOCALHOST_AUTH_URL } from '../../lib/constants';

// serve() binds asynchronously; the real flow opens the browser first.
const fetchWhenUp = async (url: string) => {
  for (let i = 0; i < 50; i++) {
    try {
      return await fetch(url);
    } catch {
      await new Promise((r) => setTimeout(r, 20));
    }
  }
  throw new Error('auth server never came up');
};

describe('createLocalAuthServer', () => {
  it('ignores callbacks without this login’s state, then accepts the real one', async () => {
    const { listenForAuthRedirect } =
      await createLocalAuthServer('expected-state');
    const pending = listenForAuthRedirect();

    const forged = await fetchWhenUp(
      `${LOCALHOST_AUTH_URL}/?token=attacker-ticket&state=wrong`,
    );
    expect(forged.status).toBe(400);

    const missing = await fetch(
      `${LOCALHOST_AUTH_URL}/?token=attacker-ticket`,
    );
    expect(missing.status).toBe(400);

    const real = await fetch(
      `${LOCALHOST_AUTH_URL}/?token=real-ticket&state=expected-state`,
    );
    expect(real.status).toBe(200);

    await expect(pending).resolves.toBe('real-ticket');
  });

  it('listens on loopback only', () => {
    expect(new URL(LOCALHOST_AUTH_URL).hostname).toBe('127.0.0.1');
  });
});
