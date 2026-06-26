import {
  getSupportedAppLanguages,
  getIosLocalizationPaths,
  SUPPORTED_APP_LANGUAGES,
} from '@/i18n/supported-languages';
import type { AppLanguage } from '@/types/app-settings';

const SUPPORTED_LANGUAGE_SET = new Set<string>(SUPPORTED_APP_LANGUAGES);

export function resolveAppLanguageFromLanguageCode(
  languageCode: string | null | undefined,
): AppLanguage {
  const normalized = languageCode?.toLowerCase();

  switch (normalized) {
    case 'tr':
      return 'tr';
    case 'de':
      return 'de';
    case 'es':
      return 'es';
    case 'ar':
      return 'ar';
    case 'ja':
      return 'ja';
    case 'zh':
    case 'zh-hans':
    case 'zh-cn':
      return 'zh';
    case 'id':
      return 'id';
    case 'pt':
    case 'pt-br':
    case 'pt-pt':
      return 'pt';
    case 'fr':
      return 'fr';
    default:
      return 'en';
  }
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  if (typeof value === 'string' && SUPPORTED_LANGUAGE_SET.has(value)) {
    return value as AppLanguage;
  }

  return 'en';
}

export { getSupportedAppLanguages, getIosLocalizationPaths };
