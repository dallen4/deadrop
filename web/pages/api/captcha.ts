import type { NextApiRequest, NextApiResponse } from 'next';
import { runMiddleware } from 'api/middleware';
import { cors } from 'api/middleware/cors';
import { verifyCaptcha } from 'api/captcha';
import { TEST_TOKEN_COOKIE } from '@shared/tests/http';
import { verifyTestToken } from 'tests/e2e/util';

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

  let status = 400,
    success = false;

  if (!token && req.cookies[TEST_TOKEN_COOKIE]) {
    const testToken = req.cookies[TEST_TOKEN_COOKIE];

    success = await verifyTestToken(testToken);
  } else {
    success = await verifyCaptcha(token);
  }

  if (success) status = 200;

  return res.status(status).send({ success });
}
