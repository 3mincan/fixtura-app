import { useCallback } from 'react';

import { translate, type TranslationKey } from '@/i18n/translations';
import { useAppStore } from '@/store/app-store';

export function useTranslation() {
  const language = useAppStore((state) => state.language);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language],
  );

  return { t, language };
}
