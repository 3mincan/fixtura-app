import type { TranslationKey } from '@/i18n/catalog.generated';
import type { AppLanguage } from '@/types/app-settings';

export const SUPPORTED_APP_LANGUAGES = [
  'en',
  'tr',
  'de',
  'es',
  'ar',
  'ja',
  'zh',
  'id',
  'pt',
  'fr',
] as const satisfies readonly AppLanguage[];

export const LANGUAGE_LABEL_KEYS: Record<AppLanguage, TranslationKey> = {
  en: 'languageEn',
  tr: 'languageTr',
  de: 'languageDe',
  es: 'languageEs',
  ar: 'languageAr',
  ja: 'languageJa',
  zh: 'languageZh',
  id: 'languageId',
  pt: 'languagePt',
  fr: 'languageFr',
};

export function getSupportedAppLanguages(): AppLanguage[] {
  return [...SUPPORTED_APP_LANGUAGES];
}

export function getLanguageLabelKey(language: AppLanguage): TranslationKey {
  return LANGUAGE_LABEL_KEYS[language];
}

export function getIosLocalizationPaths(): string[] {
  return SUPPORTED_APP_LANGUAGES.map((language) => `${language}.lproj/Localizable.strings`);
}

export function getClockLocale(language: AppLanguage): string {
  switch (language) {
    case 'tr':
      return 'tr-TR';
    case 'de':
      return 'de-DE';
    case 'es':
      return 'es-ES';
    case 'ar':
      return 'ar-SA';
    case 'ja':
      return 'ja-JP';
    case 'zh':
      return 'zh-CN';
    case 'id':
      return 'id-ID';
    case 'pt':
      return 'pt-BR';
    case 'fr':
      return 'fr-FR';
    default:
      return 'en-US';
  }
}
