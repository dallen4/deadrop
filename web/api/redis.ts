import Redis from 'ioredis';

let client: Redis;

export const getRedis = () =>
    client || (client = new Redis(process.env.REDIS_URL!));
