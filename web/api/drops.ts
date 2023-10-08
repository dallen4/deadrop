import { generateIV } from '@shared/lib/util';
import { getRedis } from 'api/redis';
import { formatDropKey } from 'lib/util';
import { nanoid } from 'nanoid';
import { generateDateTotalId } from './util';

export const getDailyDropCount = async (target: Date) => {
    const client = getRedis();

    const dateId = generateDateTotalId(target);
    const userDropCount = await client.get(dateId);

    return userDropCount ? parseInt(userDropCount) : 0;
};

export const incrementDailyDropCount = async () => {
    const client = getRedis();

    const dateId = generateDateTotalId();

    const dailyDropCount = await client.get(dateId);

    let dailyCount = 1;

    if (!dailyDropCount) await client.set(dateId, dailyCount);
    else dailyCount = await client.incr(dateId);

    return dailyCount;
};

const FIVE_MINS_IN_SEC = 10 * 60;

export const createDrop = async (peerId: string) => {
    const client = getRedis();

    const dropId = nanoid();
    const nonce = generateIV();

    const key = formatDropKey(dropId);
    await client.hset(key, { peerId, nonce });
    await client.expire(key, FIVE_MINS_IN_SEC);

    await incrementDailyDropCount();

    return { dropId, nonce };
};
