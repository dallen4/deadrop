import { getRedis } from '@lib/redis';
import { generateDropKey, generateIV } from '@lib/util';
import { nanoid } from 'nanoid';
import type { NextApiRequest, NextApiResponse } from 'next';

const HOUR_IN_SECONDS = 60 * 60;
const DAY_IN_SECONDS = HOUR_IN_SECONDS * 24;

export default async function drop(req: NextApiRequest, res: NextApiResponse) {
    if (!['POST', 'GET'].includes(req.method!)) throw new Error('Method not allowed');

    const client = getRedis();

    if (req.method === 'GET') {
        const { id: dropId } = req.query;

        const data = await client.hgetall(generateDropKey(dropId as string));

        if (!data)
            return res.status(404).json({
                error: 'Session not found',
            });

        const { peerId, nonce } = data as { peerId: string; nonce: string };

        return res.status(200).json({
            peerId,
        });
    } else if (req.method === 'POST') {
        const { id: peerId } = req.body as { id: string };

        const dropId = nanoid();
        const nonce = generateIV();

        const key = generateDropKey(dropId);
        await client.hset(key, { peerId, nonce });
        await client.expire(key, HOUR_IN_SECONDS);

        res.status(200).json({
            id: dropId,
            nonce,
        });
    }
}
