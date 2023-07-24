import type { NextApiRequest, NextApiResponse } from 'next';
import { cors } from 'api/middleware/cors';
import { runMiddleware } from 'api/middleware';
import { auth0 } from 'api/auth0';
import { getSession } from '@auth0/nextjs-auth0';

export default async function me(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, cors);

    if (!['GET'].includes(req.method!)) {
        res.setHeader('Allow', 'GET');
        res.status(405).end('Method Not Allowed');
        return;
    }

    const session = await getSession(req, res);

    if (session) {
        const user = await auth0.getUser({ id: session!.user.sub });

        return res.status(200).json({
            username: user.nickname,
            email: user.email,
            metadata: user.user_metadata,
        });
    }
}
