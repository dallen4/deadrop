import { verifyCaptcha } from '@lib/captcha';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function drop(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') throw new Error('Method not allowed');

    const { token } = req.body;

    const isValid = await verifyCaptcha(token);

    return isValid
        ? res.status(200).send({ success: true })
        : res.status(400).send({ success: false });
}
