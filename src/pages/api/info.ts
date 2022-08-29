import { getRedis } from '@lib/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function info(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') throw new Error('Method not allowed');

    const client = getRedis();
    const { username } = req.body;

    await client.set(`online:${username}`, 'fdsfs');
    const sessionId = await client.get(`drop:${username}`);

    if (sessionId) {
        res.status(200).json({
            sessionId,
        });
        return;
    } else {
        res.status(400).json({
            error: 'Session not found',
        });
        return;
    }
}
