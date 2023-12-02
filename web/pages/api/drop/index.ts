import type { NextApiRequest, NextApiResponse } from 'next';
import type { DropDetails } from '@shared/types/common';
import { getClientIp } from 'request-ip';
import { getRedis } from 'api/redis';
import { formatDropKey } from 'lib/util';
import { checkAndIncrementDropCount } from 'api/limiter';
import { createDrop } from 'api/drops';
import { DISABLE_CAPTCHA_COOKIE } from '@config/cookies';
import { cors } from 'api/middleware/cors';
import { runMiddleware } from 'api/middleware';
import { getAuthSession } from 'api/auth0';

export default async function drop(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, cors);

    const session = await getAuthSession(req, res);

    if (!['POST', 'GET', 'DELETE'].includes(req.method!)) {
        res.setHeader('Allow', 'POST,GET,DELETE');
        res.status(405).end('Method Not Allowed');
        return;
    }

    const client = getRedis();

    const close = () => client.quit();

    if (req.method === 'GET') {
        const { id: dropId } = req.query;

        const data = await client.hgetall(formatDropKey(dropId as string));

        if (!data || Object.keys(data).length === 0)
            return res.status(404).json({
                error: 'Session not found',
            });

        return res.status(200).json(data as DropDetails);
    } else if (req.method === 'POST') {
        const userIpAddr = getClientIp(req);

        const canDrop = req.cookies[DISABLE_CAPTCHA_COOKIE] || !!session
            ? true
            : await checkAndIncrementDropCount(userIpAddr!);

        if (!canDrop)
            return res
                .status(500)
                .json({ message: 'Daily drop limit reached' });

        const { id: peerId } = req.body as { id: string };

        const { dropId, nonce } = await createDrop(peerId);

        res.status(200).json({
            id: dropId,
            nonce,
        });
    } else if (req.method === 'DELETE') {
        const { id: dropId } = req.body as { id: string };

        const key = formatDropKey(dropId);
        await client.del(key);

        res.status(200).json({ success: true });
    }
}
