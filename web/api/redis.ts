import { Redis } from '@upstash/redis';

let client: Redis;

export const getRedis = () =>
  client ||
  (client = new Redis({
    url: process.env.REDIS_REST_URL!,
    token: process.env.REDIS_REST_TOKEN!,
  }));
