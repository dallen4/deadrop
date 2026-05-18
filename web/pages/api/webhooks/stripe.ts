import { clerkClient } from '@clerk/nextjs/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { Event } from 'stripe/cjs/resources/Events';

// Must be public — no Clerk auth middleware on this route
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_SUPPORTER_PRICE_ID!]: 'supporter',
  // [process.env.STRIPE_PRO_PRICE_ID!]: 'pro',
  // [process.env.STRIPE_ORG_PRICE_ID!]: 'org',
};

async function grantPlan(userId: string, priceId: string) {
  const plan = PRICE_TO_PLAN[priceId];
  if (!plan) return;

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { plan },
  });
}

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

  let event: Event;
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

  // One-time payment (Supporter)
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const { userId, priceId } = intent.metadata ?? {};
    if (userId && priceId) await grantPlan(userId, priceId);
  }

  // Subscription first payment + renewals (Pro, Org)
  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object;
    const sub = checkoutSession.subscription
      ? await stripe.subscriptions.retrieve(
          checkoutSession.subscription as string,
        )
      : null;
    const { userId, priceId } = sub?.metadata ?? {};
    if (userId && priceId) await grantPlan(userId, priceId);
  }

  return res.status(200).json({ received: true });
}
