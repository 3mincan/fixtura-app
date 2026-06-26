import { DatabaseSync } from 'node:sqlite';

import { initializeDatabase } from '@/db/init';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from '@/db/schema';
import type { DatabaseClient, SqlBindValue } from '@/db/types';

type NodeSqlBindValue = Exclude<SqlBindValue, boolean>;

function normalizeBindParams(params: SqlBindValue[]): NodeSqlBindValue[] {
  return params.map((param) => (typeof param === 'boolean' ? Number(param) : param));
}

function createNodeDatabaseClient(db: DatabaseSync): DatabaseClient {
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, ...params) {
      const result = db.prepare(source).run(...normalizeBindParams(params));
      return { changes: Number(result.changes) };
    },
    async getFirstAsync<T>(source: string, ...params: SqlBindValue[]) {
      const row = db.prepare(source).get(...normalizeBindParams(params));
      return (row ?? null) as T | null;
    },
    async getAllAsync<T>(source: string, ...params: SqlBindValue[]) {
      return db.prepare(source).all(...normalizeBindParams(params)) as T[];
    },
  };
}

export async function createTestDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(CREATE_TABLES_SQL);
  sqlite.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);

  const client = createNodeDatabaseClient(sqlite);

  return {
    client,
    close() {
      sqlite.close();
    },
  };
}

export function createNodeDatabaseClientFromSync(db: DatabaseSync): DatabaseClient {
  return createNodeDatabaseClient(db);
}

export async function initializeTestDatabase(client: DatabaseClient) {
  await initializeDatabase(client);
}
