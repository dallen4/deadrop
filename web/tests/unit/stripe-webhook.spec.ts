import type { NextApiRequest, NextApiResponse } from 'next';
import { EventEmitter } from 'events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateUserMetadata = vi.fn();
const constructEvent = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({
    users: { updateUserMetadata },
  })),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: { constructEvent },
  })),
}));

const { default: handler } = await import(
  'pages/api/webhooks/stripe'
);

function makeReq(
  body: string,
  headers: Record<string, string> = {
    'stripe-signature': 'sig_test',
  },
): NextApiRequest {
  const req = new EventEmitter() as unknown as NextApiRequest;
  req.method = 'POST';
  req.headers = headers;
  process.nextTick(() => {
    req.emit('data', Buffer.from(body));
    req.emit('end');
  });
  return req;
}

function makeRes() {
  const res = {} as NextApiResponse;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function checkoutCompletedEvent(
  object: Record<string, unknown>,
) {
  return {
    type: 'checkout.session.completed',
    data: { object },
  };
}

describe('stripe webhook handler', () => {
  beforeEach(() => {
    updateUserMetadata.mockReset();
    constructEvent.mockReset();
  });

  it('rejects non-POST methods', async () => {
    const req = makeReq('{}');
    req.method = 'GET';
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects requests with no stripe-signature header', async () => {
    const req = makeReq('{}', {});
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an invalid webhook signature', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const req = makeReq('{}');
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(updateUserMetadata).not.toHaveBeenCalled();
  });

  it('grants the supporter plan on checkout.session.completed with valid metadata', async () => {
    constructEvent.mockReturnValue(
      checkoutCompletedEvent({
        client_reference_id: 'user_123',
        metadata: { plan: 'supporter' },
      }),
    );
    const req = makeReq('{}');
    const res = makeRes();

    await handler(req, res);

    expect(updateUserMetadata).toHaveBeenCalledWith('user_123', {
      publicMetadata: { plan: 'supporter' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('verifies the signature against the raw request body', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    constructEvent.mockReturnValue(
      checkoutCompletedEvent({
        client_reference_id: 'user_123',
        metadata: { plan: 'supporter' },
      }),
    );
    const req = makeReq('{"raw":"body"}');
    const res = makeRes();

    await handler(req, res);

    expect(constructEvent).toHaveBeenCalledWith(
      Buffer.from('{"raw":"body"}'),
      'sig_test',
      'whsec_test',
    );
    vi.unstubAllEnvs();
  });

  it('returns 500 so Stripe retries when grantPlan fails', async () => {
    constructEvent.mockReturnValue(
      checkoutCompletedEvent({
        client_reference_id: 'user_123',
        metadata: { plan: 'supporter' },
      }),
    );
    updateUserMetadata.mockRejectedValue(new Error('clerk down'));
    const req = makeReq('{}');
    const res = makeRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('does not grant a plan when client_reference_id is missing', async () => {
    constructEvent.mockReturnValue(
      checkoutCompletedEvent({ metadata: { plan: 'supporter' } }),
    );
    const req = makeReq('{}');
    const res = makeRes();

    await handler(req, res);

    expect(updateUserMetadata).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('does not grant a plan for an unrecognized plan value', async () => {
    constructEvent.mockReturnValue(
      checkoutCompletedEvent({
        client_reference_id: 'user_123',
        metadata: { plan: 'totally-not-a-plan' },
      }),
    );
    const req = makeReq('{}');
    const res = makeRes();

    await handler(req, res);

    expect(updateUserMetadata).not.toHaveBeenCalled();
  });

  it('ignores unrelated event types', async () => {
    constructEvent.mockReturnValue({
      type: 'invoice.paid',
      data: { object: {} },
    });
    const req = makeReq('{}');
    const res = makeRes();

    await handler(req, res);

    expect(updateUserMetadata).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
