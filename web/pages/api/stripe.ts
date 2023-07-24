import { getUserIdsByEmail, updateUser } from 'api/auth0';
import { runMiddleware } from 'api/middleware';
import { cors } from 'api/middleware/cors';
import { buildEvent, getEmailForCheckout } from 'api/stripe';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function stripeWebhook(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    await runMiddleware(req, res, cors);

    const event = buildEvent(req);

    if (event.type === 'checkout.session.completed') {
        const sessionId = (event.data.object as any).id;
        const email = await getEmailForCheckout(sessionId);

        console.log(email);

        const usersToUpdate = await getUserIdsByEmail(email);

        const userUpdates = usersToUpdate.map((id) =>
            updateUser(id, { premium: true }),
        );

        await Promise.all(userUpdates);
    }

    return;
}
