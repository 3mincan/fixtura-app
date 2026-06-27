import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, it } from 'node:test';

import { initializeDatabase } from '@/db/init';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from '@/db/schema';
import { createNodeDatabaseClientFromSync } from '@/db/test-database';

function getSchemaVersion(db: DatabaseSync): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  return row.user_version;
}

function getSimulationColumns(db: DatabaseSync): string[] {
  const rows = db.prepare('PRAGMA table_info(simulations)').all() as { name: string }[];
  return rows.map((row) => row.name);
}

function tableExists(db: DatabaseSync, tableName: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;

  return row !== undefined;
}

describe('initializeDatabase', () => {
  let sqlite: DatabaseSync | null = null;

  afterEach(() => {
    sqlite?.close();
    sqlite = null;
  });

  it('initializes a fresh database without re-running column migrations', async () => {
    sqlite = new DatabaseSync(':memory:');
    const client = createNodeDatabaseClientFromSync(sqlite);

    await initializeDatabase(client);

    assert.equal(getSchemaVersion(sqlite), SCHEMA_VERSION);
    assert.ok(getSimulationColumns(sqlite).includes('progress_json'));
    assert.ok(getSimulationColumns(sqlite).includes('team_id'));
    assert.ok(tableExists(sqlite, 'app_settings'));
    assert.ok(tableExists(sqlite, 'analytics_event_queue'));
  });

  it('migrates an existing v1 database to the latest schema', async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(`
      CREATE TABLE simulations (
        id TEXT PRIMARY KEY NOT NULL,
        seed TEXT,
        current_stage TEXT NOT NULL DEFAULT 'group',
        tournament_phase TEXT NOT NULL DEFAULT 'group',
        user_qualified INTEGER NOT NULL DEFAULT 0,
        champion_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      PRAGMA user_version = 1;
    `);

    const client = createNodeDatabaseClientFromSync(sqlite);
    await initializeDatabase(client);

    const columns = getSimulationColumns(sqlite);
    assert.equal(getSchemaVersion(sqlite), SCHEMA_VERSION);
    assert.ok(columns.includes('progress_json'));
    assert.ok(columns.includes('team_id'));
    assert.ok(tableExists(sqlite, 'app_settings'));
  });

  it('skips duplicate column migrations when v1 already has newer columns', async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(CREATE_TABLES_SQL);
    sqlite.exec('PRAGMA user_version = 1');

    const client = createNodeDatabaseClientFromSync(sqlite);
    await initializeDatabase(client);

    assert.equal(getSchemaVersion(sqlite), SCHEMA_VERSION);
    assert.ok(getSimulationColumns(sqlite).includes('progress_json'));
    assert.ok(getSimulationColumns(sqlite).includes('team_id'));
  });

  it('is a no-op when the database is already at the latest version', async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(CREATE_TABLES_SQL);
    sqlite.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);

    const client = createNodeDatabaseClientFromSync(sqlite);
    await initializeDatabase(client);

    assert.equal(getSchemaVersion(sqlite), SCHEMA_VERSION);
  });

  it('repairs a v4 database that is missing app_settings', async () => {
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(`
      CREATE TABLE simulations (
        id TEXT PRIMARY KEY NOT NULL,
        seed TEXT,
        current_stage TEXT NOT NULL DEFAULT 'group',
        tournament_phase TEXT NOT NULL DEFAULT 'group',
        user_qualified INTEGER NOT NULL DEFAULT 0,
        champion_id TEXT,
        team_id TEXT,
        progress_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      PRAGMA user_version = ${SCHEMA_VERSION};
    `);

    const client = createNodeDatabaseClientFromSync(sqlite);
    await initializeDatabase(client);

    assert.equal(getSchemaVersion(sqlite), SCHEMA_VERSION);
    assert.ok(tableExists(sqlite, 'app_settings'));
  });
});
