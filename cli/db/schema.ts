import { text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const secretsTable = sqliteTable('secrets', {
  name: text('name').primaryKey(),
  value: text('value').notNull(),
});

export type SecretsInput = typeof secretsTable.$inferInsert;
