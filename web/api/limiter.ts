import { hashRaw } from '@shared/lib/crypto/operations';
import { getRedis } from '../lib/redis';

const DAY_IN_SEC = 60 * 60 * 24;

export const checkAndIncrementDropCount = async (ipAddress: string) => {
    const userIpHash = await hashRaw(ipAddress);

    const client = getRedis();

    const userDropCount = await client.get(userIpHash);

    if (!userDropCount) {
        await client.setex(userIpHash, DAY_IN_SEC, 1);
    } else {
        if (parseInt(userDropCount) >= 5)
            return false;
        else await client.incr(userIpHash);
    }

    return true;
};
