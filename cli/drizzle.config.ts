import type { Config } from 'drizzle-kit';

export default {
    schema: './db/schema.ts',
    out: './db/migrations',
    dialect: 'sqlite',
    driver: 'turso',
    dbCredentials: {
        url: 'file:.deadrop/default.db',
    },
} satisfies Config;
