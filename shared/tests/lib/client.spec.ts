import { describe, expect, it, vi } from 'vitest';
import { createClient } from '../../client';

const captureRequest = async (
  options: Parameters<typeof createClient>[1],
) => {
  const fetch = vi.fn(
    async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response('{}', { status: 201 }),
  );

  const client = createClient('https://api.example.test', {
    ...options,
    fetch,
  });

  await client.vault.tokens.$post({
    json: { name: 'deadrop', access: 'full-access' as never },
  });

  const [, init] = fetch.mock.calls[0];
  return {
    headers: new Headers(init?.headers),
    body: JSON.parse(String(init?.body)),
  };
};

describe('createClient', () => {
  it('keeps the json content type when headers come through init', async () => {
    const { headers, body } = await captureRequest({
      init: { headers: { Authorization: 'Bearer t' } },
    });

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer t');
    expect(body).toEqual({ name: 'deadrop', access: 'full-access' });
  });

  it('merges headers given both ways', async () => {
    const { headers } = await captureRequest({
      headers: async () => ({ 'X-Own': '1' }),
      init: { headers: { Authorization: 'Bearer t' } },
    });

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer t');
    expect(headers.get('X-Own')).toBe('1');
  });

  it('still sends credentials', async () => {
    const fetch = vi.fn(async () => new Response('{}'));
    const client = createClient('https://api.example.test', { fetch });

    await client.vault.tokens.$post({ json: {} as never });

    expect(fetch.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
    });
  });
});
