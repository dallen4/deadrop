import { NextApiRequest } from 'next';
import Stripe from 'stripe';

const client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2022-11-15',
});

export function buildEvent(request: NextApiRequest) {
    const sig = request.headers['stripe-signature']!;

    const event = client.webhooks.constructEvent(
        request.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
    );

    return event;
}

export async function getEmailForCheckout(id: string) {
    const session = await client.checkout.sessions.retrieve(id, {
        expand: ['line_items'],
    });

    // session.line_items!.data[0]

    return session.customer_email!;
}
