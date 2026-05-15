import { clerkClient } from '@clerk/nextjs/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { Session } from 'stripe/cjs/resources/Checkout';

// Must be public — no Clerk auth middleware on this route
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res
      .status(400)
      .json({ error: 'Missing stripe-signature header' });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error';
    return res
      .status(400)
      .json({ error: `Webhook error: ${message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Session;
    const userId = session.client_reference_id;

    if (!userId) {
      // No way to map this purchase to a Clerk user — log and ack so Stripe stops retrying.
      return res
        .status(200)
        .json({ received: true, note: 'no client_reference_id' });
    }

    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { plan: 'supporter' },
    });
  }

  return res.status(200).json({ received: true });
}
