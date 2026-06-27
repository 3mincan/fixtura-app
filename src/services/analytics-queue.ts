import { createSimulationId } from '@/db/simulation-id';
import type { DatabaseClient } from '@/db/types';
import { recordBackendEventsBatch } from '@/services/backend-api';
import { getOrCreateBackendUserId } from '@/services/backend-session';
import type { AnalyticsEventName, QueuedAnalyticsEvent } from '@/types/analytics-events';
import { useAppStore } from '@/store/app-store';

const BATCH_SIZE = 20;
const FLUSH_DEBOUNCE_MS = 1_500;

let boundDb: DatabaseClient | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushChain = Promise.resolve();

export function bindAnalyticsQueue(db: DatabaseClient): void {
  boundDb = db;
}

export function enqueueAnalyticsEvent(
  name: AnalyticsEventName,
  payload: Record<string, unknown> = {},
): void {
  if (!boundDb) {
    return;
  }

  const db = boundDb;
  const event: QueuedAnalyticsEvent = {
    id: createSimulationId(),
    name,
    payload,
    createdAt: Date.now(),
  };

  void db
    .runAsync(
      'INSERT INTO analytics_event_queue (id, name, payload_json, created_at) VALUES (?, ?, ?, ?)',
      event.id,
      event.name,
      JSON.stringify(event.payload),
      event.createdAt,
    )
    .then(() => {
      scheduleAnalyticsFlush();
    })
    .catch(() => {
      // Analytics must never interrupt gameplay.
    });
}

export function scheduleAnalyticsFlush(delayMs = FLUSH_DEBOUNCE_MS): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAnalyticsQueue();
  }, delayMs);
}

export function cancelScheduledAnalyticsFlush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

export async function flushAnalyticsQueue(): Promise<void> {
  if (!boundDb) {
    return;
  }

  flushChain = flushChain.then(async () => {
    await flushAnalyticsQueueOnce(boundDb!);
  });

  await flushChain;
}

async function flushAnalyticsQueueOnce(db: DatabaseClient): Promise<void> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    payload_json: string;
    created_at: number;
  }>(
    'SELECT id, name, payload_json, created_at FROM analytics_event_queue ORDER BY created_at ASC LIMIT ?',
    BATCH_SIZE,
  );

  if (rows.length === 0) {
    return;
  }

  const userId =
    useAppStore.getState().backendUserId ?? (await getOrCreateBackendUserId(db).catch(() => null));

  const events = rows.map((row) => ({
    name: row.name,
    payload: parsePayload(row.payload_json),
    clientCreatedAt: row.created_at,
  }));

  try {
    await recordBackendEventsBatch({
      userId,
      events,
    });

    const placeholders = rows.map(() => '?').join(', ');
    await db.runAsync(
      `DELETE FROM analytics_event_queue WHERE id IN (${placeholders})`,
      ...rows.map((row) => row.id),
    );

    if (rows.length === BATCH_SIZE) {
      scheduleAnalyticsFlush(0);
    }
  } catch {
    // Leave events in queue for a later flush attempt.
  }
}

function parsePayload(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed payloads.
  }

  return {};
}
