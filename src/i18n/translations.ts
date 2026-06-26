import type { AppLanguage } from '@/types/app-settings';

import {
  translationCatalogs,
  type TranslationKey,
} from '@/i18n/catalog.generated';

export type { TranslationKey };

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  let message = translationCatalogs[language][key] ?? translationCatalogs.en[key] ?? key;

  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      message = message.replace(`{${paramKey}}`, String(value));
    }
  }

  return message;
}
