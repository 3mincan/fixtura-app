import { CREATE_TABLES_SQL, MIGRATION_V5_SQL, SCHEMA_VERSION } from '@/db/schema';
import type { DatabaseClient } from '@/db/types';

type SchemaVersionRow = {
  user_version: number;
};

type TableInfoRow = {
  name: string;
};

async function addColumnIfMissing(
  db: DatabaseClient,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const columns = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${table})`);

  if (!columns.some((col) => col.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function ensureAppSettingsTable(db: DatabaseClient): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      settings_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

async function ensureAnalyticsQueueTable(db: DatabaseClient): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS analytics_event_queue (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

export async function initializeDatabase(db: DatabaseClient): Promise<void> {
  await ensureAnalyticsQueueTable(db);

  const versionRow = await db.getFirstAsync<SchemaVersionRow>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= SCHEMA_VERSION) {
    await ensureAppSettingsTable(db);
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(CREATE_TABLES_SQL);
    currentVersion = SCHEMA_VERSION;
  }

  if (currentVersion === 1) {
    await addColumnIfMissing(db, 'simulations', 'progress_json', 'TEXT');
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    await addColumnIfMissing(db, 'simulations', 'team_id', 'TEXT');
    currentVersion = 3;
  }

  if (currentVersion === 3) {
    await ensureAppSettingsTable(db);
    currentVersion = 4;
  }

  if (currentVersion === 4) {
    await db.execAsync(MIGRATION_V5_SQL);
    currentVersion = 5;
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  await ensureAppSettingsTable(db);
}
