import { verifyCaptcha } from 'lib/captcha';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function drop(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
        return;
    }

    const { token } = req.body;

    const isValid = await verifyCaptcha(token);

    return isValid
        ? res.status(200).send({ success: true })
        : res.status(400).send({ success: false });
}
