import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { createTestDatabase, initializeTestDatabase } from '@/db/test-database';
import {
  bindAnalyticsQueue,
  cancelScheduledAnalyticsFlush,
  enqueueAnalyticsEvent,
  flushAnalyticsQueue,
} from '@/services/analytics-queue';
import { useAppStore } from '@/store/app-store';

describe('analytics queue', () => {
  let close: (() => void) | null = null;

  beforeEach(() => {
    useAppStore.setState({
      backendUserId: 'user-test',
      backendAnonymousId: 'anon-test',
    });
  });

  afterEach(async () => {
    cancelScheduledAnalyticsFlush();
    await flushAnalyticsQueue();
    close?.();
    close = null;
    mock.restoreAll();
  });

  it('persists queued events locally', async () => {
    const { client, close: closeDb } = await createTestDatabase();
    close = closeDb;
    await initializeTestDatabase(client);
    bindAnalyticsQueue(client);

    enqueueAnalyticsEvent('team_selected', {
      teamId: 'mex',
      gameMode: 'predict',
      startMode: 'beginning',
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const row = await client.getFirstAsync<{ name: string }>(
      'SELECT name FROM analytics_event_queue LIMIT 1',
    );

    assert.equal(row?.name, 'team_selected');
  });

  it('flushes queued events to the backend batch endpoint', async () => {
    const { client, close: closeDb } = await createTestDatabase();
    close = closeDb;
    await initializeTestDatabase(client);
    bindAnalyticsQueue(client);

    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      Response.json({ accepted: 1, eventIds: ['evt-1'] }, { status: 202 }),
    );

    enqueueAnalyticsEvent('session_started', {
      sessionId: 'session-1',
      platform: 'ios',
      appVersion: '1.0.0',
      language: 'en',
    });

    await flushAnalyticsQueue();

    assert.equal(fetchMock.mock.callCount(), 1);
    const [url, init] = fetchMock.mock.calls[0]?.arguments as [string, RequestInit];
    assert.match(url, /\/events\/batch$/);
    assert.equal((init.headers as Record<string, string>)['x-user-id'], 'user-test');

    const remaining = await client.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM analytics_event_queue',
    );
    assert.equal(remaining?.count, 0);

    fetchMock.mock.restore();
  });
});
