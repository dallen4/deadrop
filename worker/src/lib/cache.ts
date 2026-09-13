import {
  formatDropKey,
  generateId,
  generateIV,
} from '@shared/lib/util';
import { DropDetails } from '@shared/types/common';
import { Context } from 'hono';
import { hash } from './crypto';
import { HonoCtx } from './http/core';

const DAY_IN_SEC = 60 * 60 * 24;

export const generateDateTotalId = (target?: Date) => {
  const currDate = target || new Date();
  const month = currDate.getMonth() + 1;
  const date = currDate.getDate();
  const year = currDate.getFullYear();

  return `total:${month}/${date}/${year}`;
};

type IncrementOptions = {
  limit?: number;
  expirationTtl?: number;
};

export const createCacheHandlers = (c: Context<HonoCtx>) => {
  const client = c.env.DROP_STORE;

  const getDailyDropCount = async (target: Date) => {
    const dateId = generateDateTotalId(target);

    const userDropCount = await client.get<number>(dateId, 'json');

    return userDropCount ? userDropCount : 0;
  };

  const checkAndIncrementEntry = async (
    key: string,
    { limit, expirationTtl }: IncrementOptions = {},
  ) => {
    const count = await client.get<number>(key, 'json');

    const dailyCount = count !== null ? count + 1 : 1;

    if (!!limit && limit !== Infinity && dailyCount > limit)
      return false;

    await client.put(key, dailyCount.toString(), { expirationTtl });

    return true;
  };

  const incrementDailyDropCount = async () => {
    const dateId = generateDateTotalId();

    return checkAndIncrementEntry(dateId);
  };

  const FIVE_MINS_IN_SEC = 10 * 60;

  const createDrop = async (
    peerId: string,
    maxGrabbers = 1,
    disableIncrement = false,
  ) => {
    // 22 alphanumeric chars: ~131 bits (OWASP 128-bit min) and no `-`/`_` that
    // would parse as a flag in `deadrop grab <id>`.
    const dropId = generateId(22);
    const nonce = generateIV();

    const key = formatDropKey(dropId);

    await client.put(
      key,
      JSON.stringify({ peerId, nonce, maxGrabbers }),
      { expirationTtl: FIVE_MINS_IN_SEC },
    );

    if (!disableIncrement) await incrementDailyDropCount();

    return { dropId, nonce };
  };

  const getDrop = async (id: string) => {
    const dropItem: DropDetails | null =
      await client.get<DropDetails>(formatDropKey(id), 'json');

    return dropItem;
  };

  const deleteDrop = async (id: string): Promise<boolean> => {
    const key = formatDropKey(id);
    await client.delete(key);

    return true;
  };

  const checkAndIncrementUserDropCount = async (
    ipAddress: string,
    limit: number,
  ) => {
    const userIpHash = await hash(ipAddress);

    return checkAndIncrementEntry(userIpHash, {
      limit,
      expirationTtl: DAY_IN_SEC,
    });
  };

  const checkAndIncrementAuthUserDropCount = async (
    userId: string,
    limit: number,
  ) => {
    const currDate = new Date();
    const dateStr = `${currDate.getFullYear()}-${currDate.getMonth() + 1}-${currDate.getDate()}`;
    const key = `user:${userId}:drops:${dateStr}`;

    return checkAndIncrementEntry(key, {
      limit,
      expirationTtl: DAY_IN_SEC,
    });
  };

  return {
    checkAndIncrementUserDropCount,
    checkAndIncrementAuthUserDropCount,
    createDrop,
    getDrop,
    deleteDrop,
    getDailyDropCount,
  };
};
