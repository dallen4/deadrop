import type { NextApiRequest, NextApiResponse } from 'next';
import type { DropDetails } from '@shared/types/common';
import { getRedis } from 'lib/redis';
import { generateIV } from '@shared/lib/util';
import { generateDropKey } from 'lib/util';
import { nanoid } from 'nanoid';

const FIVE_MINS_IN_SEC = 10 * 60;

export default async function drop(req: NextApiRequest, res: NextApiResponse) {
    if (!['POST', 'GET', 'DELETE'].includes(req.method!)) {
        res.setHeader('Allow', 'POST,GET,DELETE');
        res.status(405).end('Method Not Allowed');
        return;
    }

    const client = getRedis();

    const close = () => client.quit();

    if (req.method === 'GET') {
        const { id: dropId } = req.query;

        const data = await client.hgetall(generateDropKey(dropId as string));

        if (!data || Object.keys(data).length === 0)
            return res.status(404).json({
                error: 'Session not found',
            });

        return res.status(200).json(data as DropDetails);
    } else if (req.method === 'POST') {
        const { id: peerId } = req.body as { id: string };

        const dropId = nanoid();
        const nonce = generateIV();

        const key = generateDropKey(dropId);
        await client.hset(key, { peerId, nonce });
        await client.expire(key, FIVE_MINS_IN_SEC);

        res.status(200).json({
            id: dropId,
            nonce,
        });
    } else if (req.method === 'DELETE') {
        const { id: dropId } = req.body as { id: string };

        const key = generateDropKey(dropId);
        await client.del(key);

        res.status(200).json({ success: true });
    }
}
