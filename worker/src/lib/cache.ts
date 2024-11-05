import { hashRaw } from '@shared/lib/crypto/operations';
import { HonoCtx } from './http/core';
import { Context } from 'hono';
import { generateDateTotalId } from '../../../web/api/util';
import { nanoid } from 'nanoid';
import { formatDropKey, generateIV } from '@shared/lib/util';
import { DropDetails } from '@shared/types/common';

const DAY_IN_SEC = 60 * 60 * 24;

export const createCacheHandlers = (c: Context<HonoCtx>) => {
  const client = c.get('redis');

  const getDailyDropCount = async (target: Date) => {
    const dateId = generateDateTotalId(target);
    const userDropCount = await client.get<number>(dateId);

    return userDropCount ? userDropCount : 0;
  };

  const incrementDailyDropCount = async () => {
    const dateId = generateDateTotalId();

    const dailyDropCount = await client.get(dateId);

    let dailyCount = 1;

    if (!dailyDropCount) await client.set(dateId, dailyCount);
    else dailyCount = await client.incr(dateId);

    return dailyCount;
  };

  const FIVE_MINS_IN_SEC = 10 * 60;

  const createDrop = async (
    peerId: string,
    disableIncrement = false,
  ) => {
    const dropId = nanoid();
    const nonce = generateIV();

    const key = formatDropKey(dropId);

    await client.hset(key, { peerId, nonce });
    await client.expire(key, FIVE_MINS_IN_SEC);

    if (disableIncrement) await incrementDailyDropCount();

    return { dropId, nonce };
  };

  const getDrop = async (id: string) => {
    const dropItem = await client.hgetall<DropDetails>(
      formatDropKey(id),
    );

    return dropItem;
  };

  const deleteDrop = async (id: string): Promise<boolean> => {
    const key = formatDropKey(id);
    await client.del(key);

    return true;
  };

  const checkAndIncrementUserDropCount = async (
    ipAddress: string,
  ) => {
    const userIpHash = await hashRaw(ipAddress);

    const userDropCount = await client.get<number>(userIpHash);

    if (!userDropCount) {
      await client.setex(userIpHash, DAY_IN_SEC, 1);
    } else {
      if (userDropCount >= c.env.DAILY_DROP_LIMIT) return false;
      else await client.incr(userIpHash);
    }

    return true;
  };

  return {
    checkAndIncrementUserDropCount,
    createDrop,
    getDrop,
    deleteDrop,
    getDailyDropCount,
  };
};
