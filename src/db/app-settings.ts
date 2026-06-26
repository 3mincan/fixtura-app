import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
} from '@/types/app-settings';
import type { DatabaseClient } from '@/db/types';
import { normalizeAppLanguage } from '@/i18n/resolve-app-language';
import { normalizeSimulationSpeed } from '@/utils/normalize-simulation-speed';

export function parseAppSettingsJson(settingsJson: string | null | undefined): AppSettings {
  if (!settingsJson) {
    return { ...DEFAULT_APP_SETTINGS };
  }

  try {
    const parsed = JSON.parse(settingsJson) as Partial<AppSettings> & { simulationSpeed?: unknown };

    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      language: normalizeAppLanguage(parsed.language),
      simulationSpeed: normalizeSimulationSpeed(parsed.simulationSpeed),
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export async function loadAppSettings(db: DatabaseClient): Promise<AppSettings> {
  try {
    const row = await db.getFirstAsync<{ settings_json: string | null }>(
      'SELECT settings_json FROM app_settings WHERE id = 1',
    );

    return parseAppSettingsJson(row?.settings_json);
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export async function saveAppSettings(
  db: DatabaseClient,
  settings: AppSettings,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (id, settings_json, updated_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       settings_json = excluded.settings_json,
       updated_at = excluded.updated_at`,
    JSON.stringify(settings),
    Date.now(),
  );
}
