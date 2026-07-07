import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuth = vi.fn();
const getUser = vi.fn();
const sessionsCreate = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  getAuth: (...args: unknown[]) => getAuth(...args),
  clerkClient: vi.fn(async () => ({
    users: { getUser },
  })),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: sessionsCreate } },
  })),
}));

const { default: handler } = await import(
  'pages/api/stripe/checkout'
);

function makeReq(
  overrides: Partial<NextApiRequest> = {},
): NextApiRequest {
  return {
    method: 'POST',
    headers: { origin: 'https://deadrop.io' },
    ...overrides,
  } as NextApiRequest;
}

function makeRes() {
  const res = {} as NextApiResponse;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('stripe checkout handler', () => {
  beforeEach(() => {
    getAuth.mockReset();
    getUser.mockReset();
    sessionsCreate.mockReset();
    process.env.STRIPE_SUPPORTER_PRICE_ID = 'price_test_123';
    getUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: 'test@deadrop.io' }],
    });
  });

  it('rejects non-POST methods', async () => {
    const req = makeReq({ method: 'GET' });
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects unauthenticated requests', async () => {
    getAuth.mockReturnValue({ userId: null });
    const req = makeReq();
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('500s when STRIPE_SUPPORTER_PRICE_ID is not configured', async () => {
    delete process.env.STRIPE_SUPPORTER_PRICE_ID;
    getAuth.mockReturnValue({ userId: 'user_123' });
    const req = makeReq();
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('creates a one-time supporter checkout session for the authenticated user', async () => {
    getAuth.mockReturnValue({ userId: 'user_123' });
    sessionsCreate.mockResolvedValue({
      client_secret: 'cs_test_secret',
    });
    const req = makeReq();
    const res = makeRes();

    await handler(req, res);

    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        client_reference_id: 'user_123',
        customer_email: 'test@deadrop.io',
        metadata: { plan: 'supporter' },
        line_items: [
          { price: 'price_test_123', quantity: 1 },
        ],
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      clientSecret: 'cs_test_secret',
    });
  });

  it('500s when Stripe session creation fails', async () => {
    getAuth.mockReturnValue({ userId: 'user_123' });
    sessionsCreate.mockRejectedValue(new Error('stripe down'));
    const req = makeReq();
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
