import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, it } from 'node:test';

import { CREATE_TABLES_SQL, SCHEMA_VERSION, TABLE_NAMES } from '@/db/schema';

type SqliteMasterRow = {
  name: string;
  type: string;
};

function createInMemoryDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec(CREATE_TABLES_SQL);
  return db;
}

function getTableNames(db: DatabaseSync) {
  const rows = db
    .prepare("SELECT name, type FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as SqliteMasterRow[];

  return rows.map((row) => row.name).sort();
}

describe('database schema', () => {
  let db: DatabaseSync | null = null;

  afterEach(() => {
    db?.close();
    db = null;
  });

  it('creates the required tables', () => {
    db = createInMemoryDatabase();

    assert.deepEqual(getTableNames(db), [...TABLE_NAMES].sort());
  });

  it('sets schema version after initialization sql', () => {
    db = createInMemoryDatabase();
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);

    const versionRow = db.prepare('PRAGMA user_version').get() as { user_version: number };

    assert.equal(versionRow.user_version, SCHEMA_VERSION);
  });
});
