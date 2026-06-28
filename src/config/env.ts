import Constants from 'expo-constants';

import { getBackendBaseUrl as getBackendBaseUrlFromEnv } from '@/config/backend-url';

export function getBackendBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.backendBaseUrl;

  if (typeof fromExtra === 'string' && fromExtra.length > 0) {
    return fromExtra.replace(/\/+$/, '');
  }

  return getBackendBaseUrlFromEnv();
}
