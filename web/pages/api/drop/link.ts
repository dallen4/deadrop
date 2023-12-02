import type { NextApiRequest, NextApiResponse } from 'next';
import { cors } from 'api/middleware/cors';
import { runMiddleware } from 'api/middleware';
import { getAuthSession, getUserById } from 'api/auth0';

export default async function initDropLink(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, cors);

    if (!['GET'].includes(req.method!)) {
        res.setHeader('Allow', 'GET');
        res.status(405).end('Method Not Allowed');
        return;
    }

    const { id: dropId } = req.query;

    return res.status(200).json({});
}
