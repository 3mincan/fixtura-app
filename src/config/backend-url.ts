const DEFAULT_BACKEND_BASE_URL = 'https://api.fixtura.xyz';

export function getBackendBaseUrl(): string {
  const fromProcess = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

  if (typeof fromProcess === 'string' && fromProcess.length > 0) {
    return normalizeBaseUrl(fromProcess);
  }

  return DEFAULT_BACKEND_BASE_URL;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
