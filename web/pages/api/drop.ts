import type { NextApiRequest, NextApiResponse } from 'next';
import type { DropDetails } from '@shared/types/common';
import { getClientIp } from 'request-ip';
import { getRedis } from 'lib/redis';
import { formatDropKey } from 'lib/util';
import { checkAndIncrementDropCount } from 'api/limiter';
import { createDrop } from 'api/drops';
import { DISABLE_CAPTCHA_COOKIE } from '@config/cookies';
import Cors from 'cors';
// Initializing the cors middleware
// You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
const cors = Cors({
    methods: ['POST', 'GET', 'HEAD'],
    origin: (origin, callback) => {
        console.log(origin);
        if (
            process.env.NODE_ENV !== 'production' &&
            origin!.startsWith('http://localhost:')
        )
            callback(null, true);
        if (!origin || origin!.includes('vscode-webview:'))
            callback(null, true);
        else callback(new Error('Invalid origin'));
    },
});

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    fn: (...params: any) => any,
) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) {
                return reject(result);
            }

            return resolve(result);
        });
    });
}

export default async function drop(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, cors);
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

        const canDrop = req.cookies[DISABLE_CAPTCHA_COOKIE]
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
