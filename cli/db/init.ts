import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

export const initDB = (path: string, encryptionKey: string) => {
  const client = createClient({
    url: `file:${path}`,
    encryptionKey,
  });

  return drizzle(client);
};
