import {
  sqliteTable,
  text,
  primaryKey,
} from 'drizzle-orm/sqlite-core';

export const secretsTable = sqliteTable(
  'secrets',
  {
    name: text('name').notNull(),
    value: text('value').notNull(),
    environment: text('environment').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.name, table.environment] }),
  ],
);

export type Secret = typeof secretsTable.$inferSelect;
export type SecretsInput = typeof secretsTable.$inferInsert;
