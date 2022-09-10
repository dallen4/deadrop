import { getRedis } from '@lib/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

const HOUR_IN_SECONDS = 60 * 60;
const DAY_IN_SECONDS = HOUR_IN_SECONDS * 24;

export default async function drop(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') throw new Error('Method not allowed');

    const client = getRedis();
    const { username } = req.body;

    const cacheKey = `online:${username}`;

    await client.set(cacheKey, 'fdsfs');
    await client.expire(cacheKey, HOUR_IN_SECONDS);
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
