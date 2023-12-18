import Redis from 'ioredis';

let client: Redis;

export const getRedis = () =>
    client || (client = new Redis(process.env.REDIS_URL!));

export const cleanupRedis = async () => {
    if (client) {
        await client.quit();
        console.log('Redis connection closed...');
    }
};
