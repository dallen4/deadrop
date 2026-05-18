import { getAuth } from '@clerk/nextjs/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const priceId = process.env.STRIPE_SUPPORTER_PRICE_ID;
  if (!priceId) {
    return res
      .status(500)
      .json({ error: 'STRIPE_SUPPORTER_PRICE_ID not configured' });
  }

  const origin = req.headers.origin ?? `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      return_url: `${origin}/pricing?status=success&session_id={CHECKOUT_SESSION_ID}`,
    });

    return res
      .status(200)
      .json({ clientSecret: session.client_secret });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
