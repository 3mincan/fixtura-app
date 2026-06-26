import { getLocales } from 'expo-localization';

import { resolveAppLanguageFromLanguageCode } from '@/i18n/resolve-app-language';

export function resolveDeviceAppLanguage() {
  return resolveAppLanguageFromLanguageCode(getLocales()[0]?.languageCode);
}
