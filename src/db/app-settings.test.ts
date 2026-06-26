import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, it } from 'node:test';

import { loadAppSettings } from '@/db/app-settings';
import { DEFAULT_APP_SETTINGS } from '@/types/app-settings';
import { createNodeDatabaseClientFromSync } from '@/db/test-database';

describe('loadAppSettings', () => {
  let sqlite: DatabaseSync | null = null;

  afterEach(() => {
    sqlite?.close();
    sqlite = null;
  });

  it('returns defaults when app_settings table is missing', async () => {
    sqlite = new DatabaseSync(':memory:');
    const client = createNodeDatabaseClientFromSync(sqlite);

    const settings = await loadAppSettings(client);

    assert.deepEqual(settings, DEFAULT_APP_SETTINGS);
  });
});
