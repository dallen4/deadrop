import { generateIV } from '@shared/lib/util';
import { getRedis } from 'lib/redis';
import { formatDropKey } from 'lib/util';
import { nanoid } from 'nanoid';

const FIVE_MINS_IN_SEC = 10 * 60;

export const createDrop = async (peerId: string) => {
    const client = getRedis();

    const dropId = nanoid();
    const nonce = generateIV();

    const key = formatDropKey(dropId);
    await client.hset(key, { peerId, nonce });
    await client.expire(key, FIVE_MINS_IN_SEC);

    return { dropId, nonce };
};
