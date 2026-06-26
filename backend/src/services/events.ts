import { randomUUID } from 'node:crypto';

import type { JsonStore } from '../storage/json-store.js';
import type { AnalyticsEvent, JsonObject } from '../types.js';

export class EventService {
  constructor(private readonly store: JsonStore) {}

  async record(input: {
    userId: string | null;
    name: string;
    payload: JsonObject;
  }): Promise<AnalyticsEvent> {
    const event: AnalyticsEvent = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name,
      payload: input.payload,
      createdAt: Date.now(),
    };

    await this.store.update((snapshot) => ({
      ...snapshot,
      events: [...snapshot.events, event],
    }));

    return event;
  }
}
