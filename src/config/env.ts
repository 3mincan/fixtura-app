import Constants from 'expo-constants';

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
