import { randomUUID } from 'node:crypto';

import type { JsonStore } from '../storage/json-store.js';
import type { User, UserSettings } from '../types.js';

export class UserService {
  constructor(private readonly store: JsonStore) {}

  async upsertAnonymousUser(anonymousId: string): Promise<User> {
    const now = Date.now();
    let user: User | undefined;

    await this.store.update((snapshot) => {
      user = snapshot.users.find((candidate) => candidate.anonymousId === anonymousId);

      if (user) {
        user = { ...user, lastSeenAt: now };
        return {
          ...snapshot,
          users: snapshot.users.map((candidate) => (candidate.id === user!.id ? user! : candidate)),
        };
      }

      user = {
        id: randomUUID(),
        anonymousId,
        createdAt: now,
        lastSeenAt: now,
        settings: {},
      };

      return {
        ...snapshot,
        users: [...snapshot.users, user],
      };
    });

    return user!;
  }

  async getUser(userId: string): Promise<User | null> {
    const snapshot = await this.store.read();
    return snapshot.users.find((user) => user.id === userId) ?? null;
  }

  async updateSettings(userId: string, settings: UserSettings): Promise<User | null> {
    let updatedUser: User | null = null;

    await this.store.update((snapshot) => {
      return {
        ...snapshot,
        users: snapshot.users.map((user) => {
          if (user.id !== userId) {
            return user;
          }

          updatedUser = {
            ...user,
            settings: {
              ...user.settings,
              ...settings,
            },
            lastSeenAt: Date.now(),
          };

          return updatedUser;
        }),
      };
    });

    return updatedUser;
  }
}
