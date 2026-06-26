import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { initializeDatabase } from '@/db/init';
import { DATABASE_NAME } from '@/db/schema';
import type { DatabaseClient } from '@/db/types';

export async function openAppDatabase(): Promise<SQLiteDatabase & DatabaseClient> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await initializeDatabase(db);
  return db;
}
