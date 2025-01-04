import { generateIV } from '@shared/lib/util';
import { getRedis } from 'api/redis';
import { formatDropKey } from '@shared/lib/util';
import { nanoid } from 'nanoid';
import { generateDateTotalId } from './util';
import { DropDetails } from '@shared/types/common';

export const getDailyDropCount = async (target: Date) => {
  const client = getRedis();

  const dateId = generateDateTotalId(target);
  const userDropCount = await client.get<number>(dateId);

  return userDropCount ? userDropCount : 0;
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

export const getDrop = async (id: string): Promise<DropDetails> => {
  const client = getRedis();
  const dropItem = await client.hgetall(formatDropKey(id));

  return dropItem as DropDetails;
};

export const deleteDrop = async (id: string): Promise<boolean> => {
  const client = getRedis();
  const key = formatDropKey(id);
  await client.del(key);

  return true;
};
