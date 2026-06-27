import { saveAppSettings } from '@/db/app-settings';
import { createSimulationId } from '@/db/simulation-id';
import type { DatabaseClient } from '@/db/types';
import { createBackendSession } from '@/services/backend-api';
import { useAppStore } from '@/store/app-store';
import { pickPersistableAppSettings } from '@/utils/pick-app-settings';

let pendingBackendUserId: Promise<string | null> | null = null;

export async function getOrCreateBackendUserId(db: DatabaseClient): Promise<string | null> {
  const existingUserId = useAppStore.getState().backendUserId;

  if (existingUserId) {
    return existingUserId;
  }

  pendingBackendUserId ??= createAndPersistBackendUserId(db).finally(() => {
    pendingBackendUserId = null;
  });

  return pendingBackendUserId;
}

async function createAndPersistBackendUserId(db: DatabaseClient): Promise<string | null> {
  const currentSettings = pickPersistableAppSettings(useAppStore.getState());
  const backendAnonymousId = currentSettings.backendAnonymousId ?? createSimulationId();
  const backendUserId = await createBackendSession(backendAnonymousId);

  if (!backendUserId) {
    return null;
  }

  const nextSettings = useAppStore.getState().updateSettings({
    backendAnonymousId,
    backendUserId,
  });

  await saveAppSettings(db, pickPersistableAppSettings(nextSettings));

  return backendUserId;
}
