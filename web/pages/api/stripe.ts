import { runMiddleware } from 'api/middleware';
import { cors } from 'api/middleware/cors';
import { getEmailForCheckout } from 'api/stripe';
import type { NextApiRequest, NextApiResponse } from 'next';
import type Stripe from 'stripe';

export default async function stripeWebhook(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    await runMiddleware(req, res, cors);

    const event = req.body as Stripe.Event;

    if (event.type === 'checkout.session.completed') {
        const sessionId = (event.data.object as Record<string, string>).id;

        const email = await getEmailForCheckout(sessionId);

        // const usersToUpdate = await getUserIdsByEmail(email);

        // const userUpdates = usersToUpdate.map((id) =>
        //     updateUser(id, { premium: true }),
        // );

        // try {
        //     await Promise.all(userUpdates);

        //     console.log(`${userUpdates.length} users updated...`);
        // } catch (err) {
        //     console.error(err);
        // }
    }

    return res.status(200).send({ message: 'success' });
}
