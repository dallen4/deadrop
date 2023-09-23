import { getUserIdsByEmail, updateUser } from 'api/auth0';
import { runMiddleware } from 'api/middleware';
import { cors } from 'api/middleware/cors';
import { getEmailForCheckout } from 'api/stripe';
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

export default async function stripeWebhook(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    await runMiddleware(req, res, cors);

    const event = req.body as Stripe.Event;

    if (event.type === 'checkout.session.completed') {
        const sessionId = (event.data.object as any).id;

        const email = await getEmailForCheckout(sessionId);

        console.log(email);

        const usersToUpdate = await getUserIdsByEmail(email);
        console.log(usersToUpdate);
        const userUpdates = usersToUpdate.map((id) =>
            updateUser(id, { premium: true }),
        );

        try {
            await Promise.all(userUpdates);

            console.log(`${userUpdates.length} users updated...`);
        } catch (err) {
            console.error(err);
        }
    }

    return res.status(200).send({ message: 'success' });
}
