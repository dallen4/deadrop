import type { NextApiRequest, NextApiResponse } from 'next';
import { runMiddleware } from 'api/middleware';
import { cors } from 'api/middleware/cors';
import { verifyCaptcha } from 'api/captcha';

export default async function verifyCatpcha(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await runMiddleware(req, res, cors);

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
