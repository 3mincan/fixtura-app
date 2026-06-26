import Constants from 'expo-constants';

const DEFAULT_BACKEND_BASE_URL = 'https://fixtura-backend.redsoft.uk';

export function getBackendBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.backendBaseUrl;

  if (typeof fromExtra === 'string' && fromExtra.length > 0) {
    return normalizeBaseUrl(fromExtra);
  }

  const fromProcess = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

  if (typeof fromProcess === 'string' && fromProcess.length > 0) {
    return normalizeBaseUrl(fromProcess);
  }

  return DEFAULT_BACKEND_BASE_URL;
}

export function getGeminiApiKey(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.geminiApiKey;

  if (typeof fromExtra === 'string' && fromExtra.length > 0) {
    return fromExtra;
  }

  const fromProcess = process.env.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (typeof fromProcess === 'string' && fromProcess.length > 0) {
    return fromProcess;
  }

  return null;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
