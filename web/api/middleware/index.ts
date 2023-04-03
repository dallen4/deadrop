import { NextApiRequest, NextApiResponse } from 'next/types';

export function runMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    fn: (
        req: NextApiRequest,
        res: NextApiResponse,
        cb: (result: any) => void,
    ) => any,
) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }

            return resolve(result);
        });
    });
}
