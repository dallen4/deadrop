import { Redis } from '@upstash/redis';

// Copied from web/api/redis.ts on purpose (M1 "copy first"). When M2 lifts the
// shared token-seeding surface, this and the web copy collapse into one.
let client: Redis;

export const getRedis = () =>
  client ||
  (client = new Redis({
    url: process.env.REDIS_REST_URL!,
    token: process.env.REDIS_REST_TOKEN!,
  }));
