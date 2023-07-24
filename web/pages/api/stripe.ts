import { runMiddleware } from 'api/middleware';
import { cors } from 'api/middleware/cors';
import { buildEvent } from 'api/stripe';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function stripeWebhook(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    await runMiddleware(req, res, cors);

    const stripeEvent = buildEvent(req);

    if (stripeEvent.type === 'checkout.session.completed') {}
    else return;
}
