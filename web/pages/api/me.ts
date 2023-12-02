import type { NextApiRequest, NextApiResponse } from 'next';
import { cors } from 'api/middleware/cors';
import { runMiddleware } from 'api/middleware';
import { getAuthSession, getUserById } from 'api/auth0';

export default async function me(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, cors);

    if (!['GET'].includes(req.method!)) {
        res.setHeader('Allow', 'GET');
        res.status(405).end('Method Not Allowed');
        return;
    }

    const session = await getAuthSession(req, res);

    if (session) {
        const user = await getUserById(session!.user.sub);

        return res.status(200).json(user);
    } else return res.status(200);
}
