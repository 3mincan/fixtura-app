import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';

type ExpoConfigWithExtra = ExpoConfig & {
  extra?: Record<string, unknown>;
};

const ADMOB_IOS_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? 'ca-app-pub-8524608486958068~3120395033';
const ADMOB_ANDROID_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713';
const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? 'https://fixtura-backend.redsoft.uk';

const appExpoConfig = appJson.expo as ExpoConfigWithExtra;
const appPlugins = (appExpoConfig.plugins ?? []) as NonNullable<ExpoConfig['plugins']>;

export default ({ config }: { config: ExpoConfig }): ExpoConfig => ({
  ...config,
  ...appExpoConfig,
  plugins: [
    ...appPlugins,
    'expo-dev-client',
    'expo-audio',
    'expo-localization',
    './plugins/with-ios-localizations.js',
    [
      'react-native-google-mobile-ads',
      {
        iosAppId: ADMOB_IOS_APP_ID,
        androidAppId: ADMOB_ANDROID_APP_ID,
      },
    ],
  ],
  extra: {
    ...config.extra,
    ...appExpoConfig.extra,
    backendBaseUrl: BACKEND_BASE_URL,
    geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  },
});
