import { hashRaw } from '@shared/lib/crypto/operations';
import { getRedis } from './redis';
import { get } from '@vercel/edge-config';
import { DAILY_DROP_LIMIT_COOKIE } from '@config/cookies';

const DAY_IN_SEC = 60 * 60 * 24;

export const checkAndIncrementDropCount = async (ipAddress: string) => {
    const userIpHash = await hashRaw(ipAddress);

    const client = getRedis();

    const userDropCount = await client.get(userIpHash);

    if (!userDropCount) {
        await client.setex(userIpHash, DAY_IN_SEC, 1);
    } else {
        const dailyDropLimit = await get<number>(DAILY_DROP_LIMIT_COOKIE);

        if (parseInt(userDropCount) >= dailyDropLimit!)
            return false;
        else await client.incr(userIpHash);
    }

    return true;
};
